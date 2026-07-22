import { join } from 'node:path';
import type {
  GeneratedFile,
  Generator,
  GeneratorContext,
  GeneratorResult,
} from '@mycli/generator-engine';
import { buildNames } from '@mycli/generator-engine';
import { resolveEventSystemPaths } from './config.js';

function readPathConfig(ctx: GeneratorContext) {
  const config = ctx.config.get();
  return {
    eventSystem: (config.paths as { eventSystem?: string } | undefined)?.eventSystem,
  };
}

async function writeGeneratedFiles(
  ctx: GeneratorContext,
  files: Array<{ path: string; content: string }>,
): Promise<GeneratedFile[]> {
  const written: GeneratedFile[] = [];

  for (const file of files) {
    const exists = await ctx.fs.exists(file.path);
    if (exists && !ctx.options.overwrite) {
      written.push({ path: file.path, content: file.content, action: 'skip' });
      continue;
    }

    if (!ctx.dryRun) {
      await ctx.fs.write(file.path, file.content, {
        overwrite: Boolean(ctx.options.overwrite) || !exists,
      });
    }

    written.push({
      path: file.path,
      content: file.content,
      action: exists ? 'update' : 'create',
    });
  }

  return written;
}

/**
 * Generate an integration event, JSON schema, handler, and consumer stub.
 */
export function createIntegrationEventGenerator(): Generator {
  return {
    name: 'integration-event',
    description: 'Generate an integration event with schema, handler, and consumer',
    aliases: ['ievent', 'int-event'],
    autoRegister: false,
    async run(ctx: GeneratorContext): Promise<GeneratorResult> {
      const names = buildNames(ctx.name);
      const paths = resolveEventSystemPaths(readPathConfig(ctx));
      const language =
        ctx.config.get().generators?.language ?? ctx.config.get().language ?? 'typescript';
      const data = { ...names, language, paths };
      const templateData = data as unknown as Record<string, unknown>;

      const files = await writeGeneratedFiles(ctx, [
        {
          path: join(paths.events, `${names.pascal}Event.ts`),
          content: await ctx.templates.renderFile('generators/event-system/Event.ts.ejs', {
            data: templateData,
          }),
        },
        {
          path: join(paths.schemas, `${names.kebab}.v1.schema.json`),
          content: await ctx.templates.renderFile('generators/event-system/schema.v1.json.ejs', {
            data: templateData,
          }),
        },
        {
          path: join(paths.handlers, `${names.kebab}.handler.ts`),
          content: await ctx.templates.renderFile('generators/event-system/handler.ts.ejs', {
            data: templateData,
          }),
        },
        {
          path: join(paths.consumers, `${names.kebab}.consumer.ts`),
          content: await ctx.templates.renderFile('generators/event-system/consumer.ts.ejs', {
            data: templateData,
          }),
        },
      ]);

      return {
        generator: 'integration-event',
        name: ctx.name,
        files,
      };
    },
  };
}
