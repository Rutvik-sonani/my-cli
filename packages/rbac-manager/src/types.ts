export type RbacOrm =
  | 'prisma'
  | 'drizzle'
  | 'typeorm'
  | 'mongoose'
  | 'sequelize'
  | 'mikroorm'
  | 'none';

export interface RbacSetupOptions {
  cwd?: string;
  modulesPath?: string;
  language?: 'typescript' | 'javascript';
  orm?: RbacOrm;
  dryRun?: boolean;
}

export interface RbacSetupResult {
  files: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export interface RbacTemplateData {
  orm: string;
  modulesPath: string;
  hasPrisma: boolean;
  hasDrizzle: boolean;
  hasDatabaseOrm: boolean;
}
