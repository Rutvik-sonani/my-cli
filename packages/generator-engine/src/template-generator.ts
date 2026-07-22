import { defaultFields, mapFields, parseFields } from './fields.js';
import { buildNames } from './names.js';
import { ensureLocalModuleExport } from './registration/barrel.js';
import { runAutoRegistration } from './registration/index.js';
import type {
  AutoRegisterOptions,
  GeneratedFile,
  Generator,
  GeneratorContext,
  GeneratorHook,
  GeneratorResult,
  NameVariants,
} from './types.js';

export interface TemplateGeneratorOptions {
  name: string;
  description?: string;
  aliases?: string[];
  templateDir: string;
  outputDir: (ctx: GeneratorContext, names: NameVariants) => string;
  buildData?: (ctx: GeneratorContext, names: NameVariants) => Record<string, unknown>;
  autoRegister?: boolean | AutoRegisterOptions;
  /**
   * When set, also update the local module index.ts to export the generated artifact.
   * `exportPath` is relative to the module directory without leading ./
   */
  localExport?: (
    ctx: GeneratorContext,
    names: NameVariants,
    outputDir: string,
  ) => { moduleDir: string; exportPath: string } | undefined;
  postGenerate?: (
    ctx: GeneratorContext,
    names: NameVariants,
    fields: ReturnType<typeof mapFields>,
    result: GeneratorResult,
  ) => Promise<GeneratorResult>;
}

/**
 * Factory for template-backed generators (preferred pattern).
 * Never concatenates source — always renders EJS templates.
 */
export function createTemplateGenerator(options: TemplateGeneratorOptions): Generator {
  return {
    name: options.name,
    description: options.description,
    aliases: options.aliases,
    autoRegister: Boolean(options.autoRegister),
    async run(ctx: GeneratorContext): Promise<GeneratorResult> {
      const names = buildNames(ctx.name);
      const rawFields = normalizeFields(ctx.options.fields);
      const fields = mapFields(rawFields);

      const data = {
        ...names,
        hasFields: fields.length > 0,
        ...(options.buildData?.(ctx, names) ?? {}),
        ...ctx.options,
        fields, // mapped fields win over raw options.fields
      };

      const outputDir = options.outputDir(ctx, names);
      const rendered = await ctx.templates.renderDirectory(options.templateDir, outputDir, {
        data,
        dryRun: true,
        overwrite: Boolean(ctx.options.overwrite),
      });

      const files: GeneratedFile[] = [];
      for (const file of rendered) {
        const exists = await ctx.fs.exists(file.destination);
        if (exists && !ctx.options.overwrite) {
          files.push({ path: file.destination, content: file.content, action: 'skip' });
          continue;
        }

        if (!ctx.dryRun) {
          await ctx.fs.write(file.destination, file.content, {
            overwrite: Boolean(ctx.options.overwrite) || !exists,
          });
        }

        files.push({
          path: file.destination,
          content: file.content,
          action: exists ? 'update' : 'create',
        });
      }

      let result: GeneratorResult = {
        generator: options.name,
        name: ctx.name,
        files,
        registrations: [],
      };

      if (options.localExport) {
        const target = options.localExport(ctx, names, outputDir);
        if (target) {
          const reg = await ensureLocalModuleExport({
            fs: ctx.fs,
            moduleDir: target.moduleDir,
            exportPath: target.exportPath,
            dryRun: ctx.dryRun,
          });
          result.registrations = [...(result.registrations ?? []), reg];
        }
      }

      if (options.autoRegister) {
        const autoOpts = typeof options.autoRegister === 'boolean' ? {} : options.autoRegister;
        result = await runAutoRegistration(ctx, options.name, result, autoOpts);
      }

      if (options.postGenerate) {
        result = await options.postGenerate(ctx, names, fields, result);
      }

      return result;
    },
  };
}

function normalizeFields(raw: unknown): ReturnType<typeof parseFields> {
  if (!raw) {
    return defaultFields();
  }
  if (typeof raw === 'string') {
    return parseFields(raw);
  }
  if (Array.isArray(raw)) {
    return raw as ReturnType<typeof parseFields>;
  }
  return defaultFields();
}

export function defineGenerator(generator: Generator): Generator {
  return generator;
}

export type { GeneratorHook };
