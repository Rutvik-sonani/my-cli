import type { TemplateEngine } from '@mycli/template-engine';
import { buildTemplateData, environmentFor } from '../env.js';
import type { DatabaseManager } from '../manager.js';
import type { DatabaseEngine, DatabasePlugin, DatabaseSetupOptions } from '../types.js';

interface DatabasePluginMeta {
  title: string;
  urlKey: string;
  localDev: string;
  production: string;
  dockerImage: string;
  dockerPort: number;
  dockerService: string;
}

const PLUGIN_META: Record<DatabaseEngine, DatabasePluginMeta> = {
  postgresql: {
    title: 'PostgreSQL',
    urlKey: 'DATABASE_URL',
    localDev: 'Use Docker Compose or PostgreSQL 16 locally on port 5432.',
    production:
      'Enable SSL, use PgBouncer pooling, schedule pg_dump backups, store credentials in a secret manager.',
    dockerImage: 'postgres:16-alpine',
    dockerPort: 5432,
    dockerService: 'postgres',
  },
  cockroachdb: {
    title: 'CockroachDB',
    urlKey: 'DATABASE_URL',
    localDev: 'Run CockroachDB single-node: `cockroach start-single-node --insecure`.',
    production: 'Use managed CockroachDB, enable TLS, configure backup schedules.',
    dockerImage: 'cockroachdb/cockroach:latest',
    dockerPort: 26257,
    dockerService: 'cockroachdb',
  },
  mysql: {
    title: 'MySQL',
    urlKey: 'DATABASE_URL',
    localDev: 'Use Docker Compose or MySQL 8 on port 3306.',
    production: 'Enable SSL, configure replication, use managed RDS/Cloud SQL where possible.',
    dockerImage: 'mysql:8',
    dockerPort: 3306,
    dockerService: 'mysql',
  },
  mariadb: {
    title: 'MariaDB',
    urlKey: 'DATABASE_URL',
    localDev: 'Use Docker Compose or MariaDB 11 on port 3306.',
    production: 'Enable SSL, configure backups, prefer managed MariaDB in production.',
    dockerImage: 'mariadb:11',
    dockerPort: 3306,
    dockerService: 'mariadb',
  },
  sqlite: {
    title: 'SQLite',
    urlKey: 'DATABASE_URL',
    localDev: 'File-based database at `./dev.db` — zero configuration for local dev.',
    production: 'SQLite suits edge/single-node deployments; use WAL mode and regular file backups.',
    dockerImage: 'nouchka/sqlite3:latest',
    dockerPort: 0,
    dockerService: 'sqlite',
  },
  mongodb: {
    title: 'MongoDB',
    urlKey: 'DATABASE_URL',
    localDev: 'Run MongoDB 7 locally on port 27017 or use Docker Compose.',
    production:
      'Use replica sets, enable authentication, Atlas or self-hosted with backup automation.',
    dockerImage: 'mongo:7',
    dockerPort: 27017,
    dockerService: 'mongodb',
  },
  redis: {
    title: 'Redis',
    urlKey: 'REDIS_URL',
    localDev: 'Run Redis 7 on port 6379 for caching and sessions.',
    production:
      'Use Redis Cluster or managed ElastiCache/Memorystore with TLS and persistence as needed.',
    dockerImage: 'redis:7-alpine',
    dockerPort: 6379,
    dockerService: 'redis',
  },
  sqlserver: {
    title: 'SQL Server',
    urlKey: 'DATABASE_URL',
    localDev: 'Use Docker `mcr.microsoft.com/mssql/server` on port 1433.',
    production:
      'Use Azure SQL or managed SQL Server with encrypted connections and automated backups.',
    dockerImage: 'mcr.microsoft.com/mssql/server:2022-latest',
    dockerPort: 1433,
    dockerService: 'sqlserver',
  },
};

function createDocPlugin(engine: DatabaseEngine, templates?: TemplateEngine): DatabasePlugin {
  const meta = PLUGIN_META[engine];
  return {
    name: engine,
    async configure(options: DatabaseSetupOptions): Promise<string[]> {
      const { createFileSystem } = await import('@mycli/filesystem');
      const fs = createFileSystem(options.cwd ?? process.cwd());
      const out = `docs/database-${engine}.md`;
      const data = {
        title: meta.title,
        appName: options.appName,
        urlKey: meta.urlKey,
        localDev: meta.localDev,
        production: meta.production,
      };

      if (templates) {
        const content = await templates.renderFile(
          'features/database/plugins/database-doc.md.ejs',
          {
            data,
          },
        );
        if (!options.dryRun) {
          await fs.write(out, content);
        }
      } else if (!options.dryRun) {
        await fs.write(out, `# ${meta.title}\n\nSee DATABASE.md for connection details.\n`);
      }

      return [out];
    },
    generateEnvironment(options) {
      return environmentFor({ ...options, database: engine });
    },
  };
}

/**
 * Full database plugin matching spec §54 — install, models, migration docs, docker service.
 */
export function createFullDatabasePlugin(
  engine: DatabaseEngine,
  templates: TemplateEngine,
  manager: DatabaseManager,
): DatabasePlugin {
  const meta = PLUGIN_META[engine];
  const docPlugin = createDocPlugin(engine, templates);

  return {
    name: engine,
    async install(options: DatabaseSetupOptions): Promise<void> {
      await manager.setup({ ...options, database: engine });
    },
    configure: (options) => docPlugin.configure(options),
    generateEnvironment: (options) =>
      docPlugin.generateEnvironment?.(options) ?? environmentFor({ ...options, database: engine }),
    async generateModels(options: DatabaseSetupOptions): Promise<string[]> {
      const result = await manager.setup({ ...options, database: engine, dryRun: true });
      return result.files.filter(
        (file) =>
          file.includes('schema') ||
          file.includes('entities/') ||
          file.includes('models/') ||
          file.endsWith('schema.prisma'),
      );
    },
    async generateMigration(options: DatabaseSetupOptions): Promise<string[]> {
      const { createFileSystem } = await import('@mycli/filesystem');
      const fs = createFileSystem(options.cwd ?? process.cwd());
      const out = `docs/migrations-${engine}.md`;
      const data = {
        ...buildTemplateData({ ...options, database: engine }),
        title: meta.title,
      };
      const content = await templates.renderFile('features/database/plugins/MIGRATIONS.md.ejs', {
        data,
      });
      if (!options.dryRun) {
        await fs.write(out, content);
      }
      return [out];
    },
    async generateDocker(options: DatabaseSetupOptions): Promise<string[]> {
      if (engine === 'sqlite') {
        return [];
      }
      const { createFileSystem } = await import('@mycli/filesystem');
      const fs = createFileSystem(options.cwd ?? process.cwd());
      const out = `docker/database-${engine}.yml`;
      const content = buildDockerServiceYaml(meta, options.appName);
      if (!options.dryRun) {
        await fs.ensureDir('docker');
        await fs.write(out, content);
      }
      return [out];
    },
  };
}

function dockerEnvironment(engine: DatabaseEngine, appName: string): Record<string, string> {
  const dbName = appName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  switch (engine) {
    case 'postgresql':
    case 'cockroachdb':
      return { POSTGRES_USER: 'postgres', POSTGRES_PASSWORD: 'postgres', POSTGRES_DB: dbName };
    case 'mysql':
    case 'mariadb':
      return { MYSQL_ROOT_PASSWORD: 'root', MYSQL_DATABASE: dbName };
    case 'mongodb':
      return { MONGO_INITDB_DATABASE: dbName };
    case 'redis':
      return {};
    case 'sqlserver':
      return { ACCEPT_EULA: 'Y', SA_PASSWORD: 'Password123!' };
    default:
      return {};
  }
}

function dockerVolumes(engine: DatabaseEngine, appName: string): string[] {
  const slug = appName.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
  if (engine === 'redis' || engine === 'mongodb') {
    return [`${slug}-${engine}-data:/data`];
  }
  if (engine === 'postgresql' || engine === 'cockroachdb') {
    return [`${slug}-${engine}-data:/var/lib/postgresql/data`];
  }
  return [`${slug}-${engine}-data:/var/lib/mysql`];
}

function buildDockerServiceYaml(meta: DatabasePluginMeta, appName: string): string {
  const slug = appName.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
  const engine = meta.dockerService as DatabaseEngine;
  const env = dockerEnvironment(engine, appName);
  const envLines = Object.entries(env)
    .map(([key, value]) => `      ${key}: ${value}`)
    .join('\n');
  const volume = dockerVolumes(engine, appName)[0] ?? `${slug}-data:/data`;

  return `${meta.dockerService}:
  image: ${meta.dockerImage}
  restart: unless-stopped
  ports:
    - "${meta.dockerPort}:${meta.dockerPort}"
${envLines ? `  environment:\n${envLines}\n` : ''}  volumes:
    - ${volume}
`;
}

export function createDatabasePlugin(
  engine: DatabaseEngine,
  templates?: TemplateEngine,
): DatabasePlugin {
  return createDocPlugin(engine, templates);
}

export function createPostgresPlugin(
  templates?: TemplateEngine,
  manager?: DatabaseManager,
): DatabasePlugin {
  if (templates && manager) {
    return createFullDatabasePlugin('postgresql', templates, manager);
  }
  return createDatabasePlugin('postgresql', templates);
}

export function createMysqlPlugin(templates?: TemplateEngine): DatabasePlugin {
  return createDatabasePlugin('mysql', templates);
}

export function createMongodbPlugin(templates?: TemplateEngine): DatabasePlugin {
  return createDatabasePlugin('mongodb', templates);
}

export function registerDatabasePlugin(
  manager: DatabaseManager,
  engine: DatabaseEngine,
  templates?: TemplateEngine,
): void {
  if (templates) {
    manager.registerPlugin(createFullDatabasePlugin(engine, templates, manager));
    return;
  }
  manager.registerPlugin(createDatabasePlugin(engine, templates));
}

export { PLUGIN_META as DATABASE_PLUGIN_META };
