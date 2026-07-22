import type { DatabaseEngine, OrmEngine } from './types.js';

export function typeormType(database: DatabaseEngine): string {
  switch (database) {
    case 'mysql':
    case 'mariadb':
      return 'mysql';
    case 'sqlite':
      return 'better-sqlite3';
    case 'sqlserver':
      return 'mssql';
    default:
      return 'postgres';
  }
}

export function sequelizeDialect(database: DatabaseEngine): string {
  switch (database) {
    case 'mysql':
    case 'mariadb':
      return 'mysql';
    case 'sqlite':
      return 'sqlite';
    case 'sqlserver':
      return 'mssql';
    default:
      return 'postgres';
  }
}

export function mikroOrmPackage(database: DatabaseEngine): string {
  switch (database) {
    case 'mongodb':
      return '@mikro-orm/mongodb';
    case 'mysql':
    case 'mariadb':
      return '@mikro-orm/mysql';
    case 'sqlite':
      return '@mikro-orm/sqlite';
    default:
      return '@mikro-orm/postgresql';
  }
}

export function isOrmSupported(database: DatabaseEngine, orm: OrmEngine): boolean {
  if (database === 'redis') {
    return false;
  }
  if (database === 'mongodb') {
    return orm === 'prisma' || orm === 'mongoose' || orm === 'mikroorm';
  }
  return ['prisma', 'drizzle', 'typeorm', 'sequelize', 'mikroorm'].includes(orm);
}

export function defaultOrmForDatabase(database: DatabaseEngine): OrmEngine {
  if (database === 'mongodb') {
    return 'mongoose';
  }
  return 'prisma';
}

export const DATABASE_ENGINES: DatabaseEngine[] = [
  'postgresql',
  'mysql',
  'mariadb',
  'sqlite',
  'mongodb',
  'redis',
  'sqlserver',
  'cockroachdb',
];

export const ORM_ENGINES: OrmEngine[] = [
  'prisma',
  'drizzle',
  'typeorm',
  'mongoose',
  'sequelize',
  'mikroorm',
];
