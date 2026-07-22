import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSystem } from '@mycli-cli/filesystem';
import { createTemplateEngine } from '@mycli-cli/template-engine';
import { afterEach, describe, expect, it } from 'vitest';
import { createDatabaseManager, isOrmSupported, registerDatabasePlugin } from '../src/index.js';
import { featureTemplatesRoot } from './helpers.js';

describe('DatabaseManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  function createDb() {
    const fs = createFileSystem(dir);
    const templatesRoot = featureTemplatesRoot();
    const templates = createTemplateEngine({ filesystem: fs, templatesRoot });
    const db = createDatabaseManager({ cwd: dir, filesystem: fs, templatesRoot });
    return { db, fs, templates };
  }

  it('generates Prisma schema with user and RBAC models', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-db-prisma-'));
    const { db, templates } = createDb();
    registerDatabasePlugin(db, 'postgresql', templates);

    const result = await db.setup({
      cwd: dir,
      database: 'postgresql',
      orm: 'prisma',
      appName: 'shop',
      includeAuth: true,
      includeRbac: true,
    });

    expect(result.dependencies['@prisma/client']).toBeDefined();
    const schema = await readFile(join(dir, 'prisma/schema.prisma'), 'utf8');
    expect(schema).toContain('model User');
    expect(schema).toContain('model Role');
    expect(schema).toContain('model RefreshToken');
    expect(schema).not.toContain('OAuthAccount');
    expect(schema).not.toContain('PasskeyCredential');
  });

  it('generates Prisma schema without auth relations when auth is disabled', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-db-prisma-no-auth-'));
    const { db, templates } = createDb();
    registerDatabasePlugin(db, 'postgresql', templates);

    await db.setup({
      cwd: dir,
      database: 'postgresql',
      orm: 'prisma',
      appName: 'shop',
      includeAuth: false,
      includeRbac: false,
    });

    const schema = await readFile(join(dir, 'prisma/schema.prisma'), 'utf8');
    expect(schema).toContain('model User');
    expect(schema).not.toContain('RefreshToken');
    expect(schema).not.toContain('OAuthAccount');
    expect(schema).not.toContain('PasskeyCredential');
    expect(schema).not.toContain('UserRole');
  });

  it('generates Drizzle schema and config', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-db-drizzle-'));
    const { db, fs } = createDb();

    await db.setup({
      cwd: dir,
      database: 'postgresql',
      orm: 'drizzle',
      appName: 'shop',
    });

    expect(await fs.exists('src/database/schema.ts')).toBe(true);
    expect(await fs.exists('drizzle.config.ts')).toBe(true);
    expect(await fs.exists('src/database/seed.ts')).toBe(true);
    const schema = await readFile(join(dir, 'src/database/schema.ts'), 'utf8');
    expect(schema).toContain('drizzle-orm/pg-core');
  });

  it('generates Drizzle mysql schema and client', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-db-drizzle-mysql-'));
    const { db, fs } = createDb();

    await db.setup({
      cwd: dir,
      database: 'mysql',
      orm: 'drizzle',
      appName: 'shop',
    });

    const schema = await readFile(join(dir, 'src/database/schema.ts'), 'utf8');
    expect(schema).toContain('drizzle-orm/mysql-core');
    const client = await readFile(join(dir, 'src/database/client.ts'), 'utf8');
    expect(client).toContain('drizzle-orm/mysql2');
  });

  it('generates plugin migration docs and docker service for postgres', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-db-plugin-'));
    const { db, fs, templates } = createDb();
    registerDatabasePlugin(db, 'postgresql', templates);

    await db.setup({
      cwd: dir,
      database: 'postgresql',
      orm: 'prisma',
      appName: 'shop',
    });

    expect(await fs.exists('docs/migrations-postgresql.md')).toBe(true);
    expect(await fs.exists('docker/database-postgresql.yml')).toBe(true);
  });

  it('generates TypeORM data source for MySQL', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-db-typeorm-'));
    const { db, fs, templates } = createDb();
    registerDatabasePlugin(db, 'mysql', templates);

    const result = await db.setup({
      cwd: dir,
      database: 'mysql',
      orm: 'typeorm',
      appName: 'shop',
    });

    expect(result.dependencies.typeorm).toBeDefined();
    expect(await fs.exists('src/database/data-source.ts')).toBe(true);
    const doc = await readFile(join(dir, 'docs/database-mysql.md'), 'utf8');
    expect(doc).toContain('MySQL');
  });

  it('generates TypeORM RBAC entities when includeRbac is enabled', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-db-typeorm-rbac-'));
    const { db, fs } = createDb();

    await db.setup({
      cwd: dir,
      database: 'postgresql',
      orm: 'typeorm',
      appName: 'shop',
      includeRbac: true,
    });

    expect(await fs.exists('src/database/entities/role.entity.ts')).toBe(true);
    expect(await fs.exists('src/database/entities/permission.entity.ts')).toBe(true);
    const dataSource = await readFile(join(dir, 'src/database/data-source.ts'), 'utf8');
    expect(dataSource).toContain('RolePermission');
    expect(dataSource).toContain('UserRole');
  });

  it('generates Mongoose models for MongoDB', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-db-mongo-'));
    const { db, fs, templates } = createDb();
    registerDatabasePlugin(db, 'mongodb', templates);

    const result = await db.setup({
      cwd: dir,
      database: 'mongodb',
      orm: 'mongoose',
      appName: 'shop',
    });

    expect(result.dependencies.mongoose).toBeDefined();
    expect(await fs.exists('src/database/models/user.model.ts')).toBe(true);
    expect(await fs.exists('src/database/seed.ts')).toBe(true);
  });

  it('generates Sequelize config', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-db-seq-'));
    const { db, fs } = createDb();

    await db.setup({
      cwd: dir,
      database: 'postgresql',
      orm: 'sequelize',
      appName: 'shop',
    });

    expect(await fs.exists('src/database/sequelize/config.ts')).toBe(true);
    expect(await fs.exists('src/database/seed.ts')).toBe(true);
  });

  it('generates MikroORM config', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-db-mikro-'));
    const { db, fs } = createDb();

    await db.setup({
      cwd: dir,
      database: 'postgresql',
      orm: 'mikroorm',
      appName: 'shop',
    });

    expect(await fs.exists('src/database/mikro-orm.config.ts')).toBe(true);
    expect(await fs.exists('src/database/seed.ts')).toBe(true);
  });

  it('supports drizzle with sqlserver', async () => {
    expect(isOrmSupported('sqlserver', 'drizzle')).toBe(true);
    dir = await mkdtemp(join(tmpdir(), 'mycli-db-drizzle-mssql-'));
    const { db, fs, templates } = createDb();
    registerDatabasePlugin(db, 'sqlserver', templates);
    const result = await db.setup({
      cwd: dir,
      database: 'sqlserver',
      orm: 'drizzle',
      appName: 'mssql-app',
    });
    expect(result.files).toContain('src/database/schema.ts');
    expect(await fs.exists('.env.development')).toBe(true);
    expect(await fs.exists('.env.production')).toBe(true);
    expect(await fs.exists('.env.test')).toBe(true);
  });

  it('validates ORM compatibility', () => {
    expect(isOrmSupported('mongodb', 'mongoose')).toBe(true);
    expect(isOrmSupported('mongodb', 'typeorm')).toBe(false);
    expect(isOrmSupported('redis', 'prisma')).toBe(false);
  });
});
