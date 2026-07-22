export {
  createDatabaseManager,
  DatabaseManager,
  environmentFor,
  prismaProvider,
  drizzleDialect,
  drizzleTemplateSuffix,
} from './manager.js';

export type {
  DatabaseEngine,
  OrmEngine,
  DatabaseSetupOptions,
  DatabaseSetupResult,
  DatabasePlugin,
  OrmGenerator,
} from './types.js';

export {
  createOrmGenerators,
  PrismaOrmGenerator,
  DrizzleOrmGenerator,
  TypeOrmGenerator,
  MongooseOrmGenerator,
  SequelizeOrmGenerator,
  MikroOrmGenerator,
} from './orm/index.js';

export {
  createDatabasePlugin,
  createFullDatabasePlugin,
  createPostgresPlugin,
  createMysqlPlugin,
  createMongodbPlugin,
  registerDatabasePlugin,
} from './plugins/index.js';

export {
  isOrmSupported,
  defaultOrmForDatabase,
  DATABASE_ENGINES,
  ORM_ENGINES,
  typeormType,
  sequelizeDialect,
  mikroOrmPackage,
} from './compatibility.js';
