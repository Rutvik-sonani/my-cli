import { mapFields } from '../fields.js';
import { buildNames } from '../names.js';
import type {
  AutoRegisterOptions,
  GeneratorContext,
  GeneratorResult,
  MappedField,
} from '../types.js';
import { ensureModuleBarrelExport } from './barrel.js';
import { ensureOpenApiRegistration } from './openapi.js';
import { ensureProviderRegistration } from './providers.js';
import { ensureRouteRegistration } from './routes.js';

const MODULE_LIKE = new Set(['module', 'crud']);

/**
 * Runs post-generation auto-registration for barrels, routes, providers, and OpenAPI.
 */
export async function runAutoRegistration(
  ctx: GeneratorContext,
  generatorName: string,
  result: GeneratorResult,
  options: AutoRegisterOptions = {},
): Promise<GeneratorResult> {
  if (!MODULE_LIKE.has(generatorName)) {
    const explicit =
      options.barrel === true ||
      options.routes === true ||
      options.provider === true ||
      options.openapi === true;
    if (!explicit) {
      return result;
    }
  }

  const names = buildNames(ctx.name);
  const modulesPath = ctx.config.getPath('modules');
  const fields = Array.isArray(ctx.options.fields)
    ? mapFields(ctx.options.fields as Parameters<typeof mapFields>[0])
    : ([] as MappedField[]);

  const registrations = [...(result.registrations ?? [])];
  const opts: Required<AutoRegisterOptions> = {
    barrel: options.barrel ?? MODULE_LIKE.has(generatorName),
    routes: options.routes ?? MODULE_LIKE.has(generatorName),
    provider: options.provider ?? MODULE_LIKE.has(generatorName),
    openapi: options.openapi ?? MODULE_LIKE.has(generatorName),
  };

  if (opts.barrel) {
    registrations.push(
      await ensureModuleBarrelExport({
        fs: ctx.fs,
        modulesPath,
        names,
        dryRun: ctx.dryRun,
      }),
    );
  }

  if (opts.routes) {
    registrations.push(
      await ensureRouteRegistration({
        fs: ctx.fs,
        names,
        modulesPath,
        dryRun: ctx.dryRun,
      }),
    );
  }

  if (opts.provider) {
    registrations.push(
      await ensureProviderRegistration({
        fs: ctx.fs,
        names,
        modulesPath,
        dryRun: ctx.dryRun,
      }),
    );
  }

  if (opts.openapi) {
    const openapi = await ensureOpenApiRegistration({
      fs: ctx.fs,
      names,
      fields: fields.length ? fields : undefined,
      dryRun: ctx.dryRun,
    });
    if (openapi) {
      registrations.push(openapi);
    }
  }

  return { ...result, registrations };
}
