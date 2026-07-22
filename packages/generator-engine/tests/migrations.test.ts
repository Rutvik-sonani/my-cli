import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createConfigManager } from '@mycli-cli/config-manager';
import { ApplicationContext } from '@mycli-cli/core';
import { createFileSystem } from '@mycli-cli/filesystem';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  applyMigrationPlan,
  buildCreateTableSql,
  buildNames,
  buildPrismaModelBlock,
  createMigrationGenerator,
  mapFields,
  parseFields,
  planMigration,
} from '../src/index.js';

describe('migrations', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-mig-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('builds SQL and Prisma model blocks from fields', () => {
    const names = buildNames('product');
    const fields = mapFields(parseFields('name:string,price:number'));
    const sql = buildCreateTableSql(names, fields, 'postgresql');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "products"');
    expect(sql).toContain('"name" TEXT NOT NULL');

    const model = buildPrismaModelBlock(names, fields);
    expect(model).toContain('model Product');
    expect(model).toContain('price Float');
  });

  it('generates prisma migration files', async () => {
    const fs = createFileSystem(dir);
    await fs.writeJson('.myclirc.json', {
      version: '1.0.0',
      orm: 'prisma',
      database: 'postgresql',
    });
    await fs.write('prisma/schema.prisma', 'generator client { provider = "prisma-client-js" }\n');

    const config = createConfigManager({ cwd: dir, filesystem: fs });
    await config.load();
    const names = buildNames('order');
    const fields = mapFields(parseFields('total:number,status:string'));

    const plan = await planMigration({ config, fs, dryRun: false }, names, fields);
    const written = await applyMigrationPlan({ config, fs, dryRun: false }, plan);

    expect(written.some((f) => f.path.includes('prisma/migrations/'))).toBe(true);
    expect(written.some((f) => f.path === 'prisma/schema.prisma')).toBe(true);

    const schema = await readFile(join(dir, 'prisma/schema.prisma'), 'utf8');
    expect(schema).toContain('model Order');
  });

  it('generates drizzle migration sql', async () => {
    const fs = createFileSystem(dir);
    await fs.writeJson('.myclirc.json', {
      version: '1.0.0',
      orm: 'drizzle',
      database: 'postgresql',
    });

    const config = createConfigManager({ cwd: dir, filesystem: fs });
    await config.load();
    const plan = await planMigration(
      { config, fs, dryRun: false },
      buildNames('item'),
      mapFields(parseFields('name:string')),
    );

    expect(plan.files[0]?.path).toMatch(/^drizzle\/\d+_create_items\.sql$/);
    expect(plan.files[0]?.content).toContain('CREATE TABLE');
  });

  it('generates mikroorm migration files', async () => {
    const fs = createFileSystem(dir);
    await fs.writeJson('.myclirc.json', {
      version: '1.0.0',
      orm: 'mikroorm',
      database: 'postgresql',
    });

    const config = createConfigManager({ cwd: dir, filesystem: fs });
    await config.load();
    const plan = await planMigration(
      { config, fs, dryRun: false },
      buildNames('category'),
      mapFields(parseFields('name:string')),
    );

    expect(plan.orm).toBe('mikroorm');
    expect(plan.files[0]?.path).toMatch(/Migration\d+_CreateCategories\.ts$/);
    expect(plan.files[0]?.content).toContain('@mikro-orm/migrations');
  });

  it('generates drizzle migration sql for mysql dialect', async () => {
    const fs = createFileSystem(dir);
    await fs.writeJson('.myclirc.json', {
      version: '1.0.0',
      orm: 'drizzle',
      database: 'mysql',
    });

    const config = createConfigManager({ cwd: dir, filesystem: fs });
    await config.load();
    const plan = await planMigration(
      { config, fs, dryRun: false },
      buildNames('item'),
      mapFields(parseFields('name:string')),
    );

    expect(plan.schemaUpdates?.[0]?.mergeContent).toContain('mysqlTable');
  });

  it('runs migration generator command', async () => {
    const fs = createFileSystem(dir);
    await fs.writeJson('.myclirc.json', {
      version: '1.0.0',
      orm: 'typeorm',
      database: 'postgresql',
    });
    const config = createConfigManager({ cwd: dir, filesystem: fs });
    await config.load();

    const app = new ApplicationContext({ environment: 'test', logLevel: 'silent' });
    await app.boot();

    const generator = createMigrationGenerator();
    const result = await generator.run({
      app,
      config,
      fs,
      templates: {} as never,
      name: 'invoice',
      options: { fields: 'amount:number,status:string' },
      dryRun: false,
    });

    expect(result.files[0]?.path).toMatch(/src\/database\/migrations\/\d+-CreateInvoices\.ts$/);
    await app.shutdown();
  });
});
