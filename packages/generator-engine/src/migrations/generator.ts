import { defaultFields, mapFields, parseFields } from '../fields.js';
import { buildNames } from '../names.js';
import type { Generator, GeneratorContext, GeneratorResult } from '../types.js';
import { applyMigrationPlan, planMigration } from './index.js';

export function createMigrationGenerator(): Generator {
  return {
    name: 'migration',
    description: 'Generate database migration for the current ORM',
    aliases: ['migrate'],
    autoRegister: false,
    async run(ctx: GeneratorContext): Promise<GeneratorResult> {
      const names = buildNames(ctx.name);
      const fields = mapFields(normalizeFields(ctx.options.fields));
      const migrationCtx = { config: ctx.config, fs: ctx.fs, dryRun: ctx.dryRun };
      const plan = await planMigration(migrationCtx, names, fields);
      const written = await applyMigrationPlan(migrationCtx, plan);

      return {
        generator: 'migration',
        name: ctx.name,
        files: written.map((file) => ({
          path: file.path,
          content: file.content,
          action: file.action,
        })),
        registrations: [],
      };
    },
  };
}

export async function appendCrudMigrations(
  ctx: GeneratorContext,
  result: GeneratorResult,
): Promise<GeneratorResult> {
  if (ctx.options.noMigration) {
    return result;
  }

  const names = buildNames(ctx.name);
  const fields = mapFields(normalizeFields(ctx.options.fields));
  const migrationCtx = { config: ctx.config, fs: ctx.fs, dryRun: ctx.dryRun };
  const plan = await planMigration(migrationCtx, names, fields);
  const written = await applyMigrationPlan(migrationCtx, plan);

  return {
    ...result,
    files: [
      ...result.files,
      ...written.map((file) => ({
        path: file.path,
        content: file.content,
        action: file.action,
      })),
    ],
  };
}

function normalizeFields(raw: unknown): ReturnType<typeof parseFields> {
  if (!raw) return defaultFields();
  if (typeof raw === 'string') return parseFields(raw);
  if (Array.isArray(raw)) return raw as ReturnType<typeof parseFields>;
  return defaultFields();
}
