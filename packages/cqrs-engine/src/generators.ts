import { join } from 'node:path';
import type {
  GeneratedFile,
  Generator,
  GeneratorContext,
  GeneratorResult,
} from '@mycli-cli/generator-engine';
import { buildNames } from '@mycli-cli/generator-engine';
import { resolveCqrsPaths } from './paths.js';

function readPathConfig(ctx: GeneratorContext) {
  const config = ctx.config.get();
  return {
    cqrs: (config.paths as { cqrs?: string } | undefined)?.cqrs,
    application: (config.paths as { application?: string } | undefined)?.application,
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
 * Generate a command + handler pair wired for CommandBus registration.
 */
export function createCommandGenerator(): Generator {
  return {
    name: 'command',
    description: 'Generate a CQRS command and handler',
    aliases: ['cmd'],
    autoRegister: false,
    async run(ctx: GeneratorContext): Promise<GeneratorResult> {
      const names = buildNames(ctx.name);
      const paths = resolveCqrsPaths(readPathConfig(ctx));
      const language =
        ctx.config.get().generators?.language ?? ctx.config.get().language ?? 'typescript';
      const data = { ...names, language, paths };
      const templateData = data as unknown as Record<string, unknown>;

      const files = await writeGeneratedFiles(ctx, [
        {
          path: join(paths.commands, `${names.pascal}Command.ts`),
          content: await ctx.templates.renderFile('generators/cqrs/Command.ts.ejs', {
            data: templateData,
          }),
        },
        {
          path: join(paths.commandHandlers, `${names.pascal}Handler.ts`),
          content: await ctx.templates.renderFile('generators/cqrs/CommandHandler.ts.ejs', {
            data: templateData,
          }),
        },
      ]);

      return {
        generator: 'command',
        name: ctx.name,
        files,
      };
    },
  };
}

/**
 * Generate a query + handler pair wired for QueryBus registration.
 */
export function createQueryGenerator(): Generator {
  return {
    name: 'query',
    description: 'Generate a CQRS query and handler',
    aliases: ['qry'],
    autoRegister: false,
    async run(ctx: GeneratorContext): Promise<GeneratorResult> {
      const names = buildNames(ctx.name);
      const paths = resolveCqrsPaths(readPathConfig(ctx));
      const language =
        ctx.config.get().generators?.language ?? ctx.config.get().language ?? 'typescript';
      const data = { ...names, language, paths };
      const templateData = data as unknown as Record<string, unknown>;

      const files = await writeGeneratedFiles(ctx, [
        {
          path: join(paths.queries, `${names.pascal}Query.ts`),
          content: await ctx.templates.renderFile('generators/cqrs/Query.ts.ejs', {
            data: templateData,
          }),
        },
        {
          path: join(paths.queryHandlers, `${names.pascal}Handler.ts`),
          content: await ctx.templates.renderFile('generators/cqrs/QueryHandler.ts.ejs', {
            data: templateData,
          }),
        },
      ]);

      return {
        generator: 'query',
        name: ctx.name,
        files,
      };
    },
  };
}
