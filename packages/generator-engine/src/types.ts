import type { ConfigManager } from '@mycli-cli/config-manager';
import type { ApplicationContext } from '@mycli-cli/core';
import type { FileSystem } from '@mycli-cli/filesystem';
import type { TemplateEngine } from '@mycli-cli/template-engine';

export type GeneratedFileAction = 'create' | 'update' | 'skip';

export interface GeneratedFile {
  path: string;
  content: string;
  action: GeneratedFileAction;
}

export interface GeneratorResult {
  generator: string;
  name: string;
  files: GeneratedFile[];
  registrations?: RegistrationResult[];
}

export interface RegistrationResult {
  kind: 'barrel' | 'routes' | 'provider' | 'openapi';
  path: string;
  action: GeneratedFileAction;
  detail?: string;
}

export interface GeneratorContext {
  app: ApplicationContext;
  config: ConfigManager;
  fs: FileSystem;
  templates: TemplateEngine;
  name: string;
  options: Record<string, unknown>;
  dryRun: boolean;
}

export interface Generator {
  name: string;
  description?: string;
  aliases?: string[];
  /**
   * When true, run post-generation auto-registration (barrels, routes, providers).
   * Defaults to true for module/crud style generators.
   */
  autoRegister?: boolean;
  run(ctx: GeneratorContext): Promise<GeneratorResult>;
}

export interface NameVariants {
  raw: string;
  name: string;
  namePlural: string;
  camel: string;
  camelPlural: string;
  pascal: string;
  pascalPlural: string;
  kebab: string;
  kebabPlural: string;
  snake: string;
  snakePlural: string;
  constant: string;
}

export type FieldType =
  | 'string'
  | 'text'
  | 'number'
  | 'int'
  | 'float'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'json'
  | 'uuid'
  | 'email'
  | 'url'
  | 'relation'
  | string;

export interface FieldDefinition {
  name: string;
  type: FieldType;
  relation?: boolean;
  optional?: boolean;
  /** Related entity name when type is relation (e.g. category:relation:Category) */
  related?: string;
}

export interface MappedField extends FieldDefinition {
  propertyName: string;
  tsType: string;
  swaggerType: string;
  swaggerFormat?: string;
  sampleValue: string;
  isRelation: boolean;
}

export interface GeneratorHook {
  name: string;
  beforeGenerate?(ctx: GeneratorContext, generatorName: string): Promise<void> | void;
  afterGenerate?(
    ctx: GeneratorContext,
    generatorName: string,
    result: GeneratorResult,
  ): Promise<GeneratorResult | undefined> | GeneratorResult | undefined;
}

export interface AutoRegisterOptions {
  /** Register into src/modules/index.ts */
  barrel?: boolean;
  /** Register into src/routes/index.ts */
  routes?: boolean;
  /** Register into src/providers/index.ts */
  provider?: boolean;
  /** Merge swagger stub into openapi.json when present */
  openapi?: boolean;
}
