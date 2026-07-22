import type { TemplateEngine } from '@mycli/template-engine';

export interface DatabaseSetupOptions {
  cwd?: string;
  database: DatabaseEngine;
  orm: OrmEngine;
  appName: string;
  dryRun?: boolean;
  includeUser?: boolean;
  includeAuth?: boolean;
  includeRbac?: boolean;
}

export type DatabaseEngine =
  | 'postgresql'
  | 'mysql'
  | 'mariadb'
  | 'sqlite'
  | 'mongodb'
  | 'redis'
  | 'sqlserver'
  | 'cockroachdb';

export type OrmEngine = 'prisma' | 'drizzle' | 'typeorm' | 'mongoose' | 'sequelize' | 'mikroorm';

export interface DatabaseSetupResult {
  files: string[];
  env: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export interface DatabasePlugin {
  name: string;
  install?(options: DatabaseSetupOptions): Promise<void> | void;
  configure(options: DatabaseSetupOptions): Promise<string[]> | string[];
  generateModels?(options: DatabaseSetupOptions): Promise<string[]>;
  generateMigration?(options: DatabaseSetupOptions): Promise<string[]>;
  generateDocker?(options: DatabaseSetupOptions): Promise<string[]>;
  generateEnvironment?(options: DatabaseSetupOptions): Record<string, string>;
}

export interface OrmGenerator {
  orm: OrmEngine;
  generate(options: DatabaseSetupOptions, templates: TemplateEngine): Promise<string[]>;
  dependencies(options: DatabaseSetupOptions): {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };
}
