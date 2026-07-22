import { mikroOrmPackage, sequelizeDialect, typeormType } from './compatibility.js';
import type { DatabaseEngine, DatabaseSetupOptions } from './types.js';

export function prismaProvider(database: DatabaseEngine): string {
  switch (database) {
    case 'postgresql':
    case 'cockroachdb':
      return 'postgresql';
    case 'mysql':
    case 'mariadb':
      return 'mysql';
    case 'sqlite':
      return 'sqlite';
    case 'sqlserver':
      return 'sqlserver';
    case 'mongodb':
      return 'mongodb';
    default:
      return 'postgresql';
  }
}

export function drizzleDialect(database: DatabaseEngine): string {
  switch (database) {
    case 'postgresql':
    case 'cockroachdb':
      return 'postgresql';
    case 'mysql':
    case 'mariadb':
      return 'mysql';
    case 'sqlite':
      return 'sqlite';
    case 'sqlserver':
      return 'mssql';
    default:
      return 'postgresql';
  }
}

export function drizzleTemplateSuffix(
  database: DatabaseEngine,
): 'pg' | 'mysql' | 'sqlite' | 'mssql' {
  const dialect = drizzleDialect(database);
  if (dialect === 'mysql') return 'mysql';
  if (dialect === 'sqlite') return 'sqlite';
  if (dialect === 'mssql') return 'mssql';
  return 'pg';
}

export function environmentFor(options: DatabaseSetupOptions): Record<string, string> {
  const name = options.appName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  switch (options.database) {
    case 'postgresql':
    case 'cockroachdb':
      return {
        DATABASE_URL: `postgresql://postgres:postgres@localhost:5432/${name}?schema=public`,
      };
    case 'mysql':
    case 'mariadb':
      return {
        DATABASE_URL: `mysql://root:root@localhost:3306/${name}`,
      };
    case 'sqlite':
      return { DATABASE_URL: 'file:./dev.db' };
    case 'mongodb':
      return { DATABASE_URL: `mongodb://localhost:27017/${name}` };
    case 'redis':
      return { REDIS_URL: 'redis://localhost:6379' };
    case 'sqlserver':
      return {
        DATABASE_URL: `sqlserver://localhost:1433;database=${name};user=sa;password=Password123;trustServerCertificate=true`,
      };
  }
}

export function buildTemplateData(options: DatabaseSetupOptions): Record<string, unknown> {
  return {
    appName: options.appName,
    database: options.database,
    orm: options.orm,
    provider: prismaProvider(options.database),
    dialect: drizzleDialect(options.database),
    typeormType: typeormType(options.database),
    sequelizeDialect: sequelizeDialect(options.database),
    mikroOrmPackage: mikroOrmPackage(options.database),
    includeUser: options.includeUser ?? true,
    includeAuth: options.includeAuth ?? false,
    includeRbac: options.includeRbac ?? false,
  };
}
