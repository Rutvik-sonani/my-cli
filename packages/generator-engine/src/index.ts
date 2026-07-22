/**
 * @mycli/generator-engine
 *
 * Laravel Artisan-style generators with EJS templates and auto-registration.
 */

export type {
  AutoRegisterOptions,
  FieldDefinition,
  FieldType,
  GeneratedFile,
  GeneratedFileAction,
  Generator,
  GeneratorContext,
  GeneratorHook,
  GeneratorResult,
  MappedField,
  NameVariants,
  RegistrationResult,
} from './types.js';

export { buildNames } from './names.js';
export {
  parseFields,
  mapField,
  mapFields,
  defaultFields,
} from './fields.js';

export {
  ensureModuleBarrelExport,
  ensureLocalModuleExport,
  upsertMarkedBlock,
} from './registration/barrel.js';
export { ensureRouteRegistration } from './registration/routes.js';
export { ensureProviderRegistration } from './registration/providers.js';
export { ensureOpenApiRegistration } from './registration/openapi.js';
export {
  ensureFeatureRouteRegistration,
  type FeatureRouteKind,
} from './registration/features.js';
export { runAutoRegistration } from './registration/index.js';

export {
  createTemplateGenerator,
  defineGenerator,
  type TemplateGeneratorOptions,
} from './template-generator.js';

export { GeneratorEngine, createGeneratorEngine, type GeneratorEngineOptions } from './engine.js';

export { createMigrationGenerator, appendCrudMigrations } from './migrations/generator.js';
export {
  planMigration,
  applyMigrationPlan,
  resolveOrm,
  resolveSqlDialect,
  type OrmKind,
} from './migrations/index.js';
export {
  buildCreateTableSql,
  buildPrismaModelBlock,
  migrationTimestamp,
} from './migrations/sql.js';

export { join } from 'node:path';
