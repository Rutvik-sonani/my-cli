import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createCli } from '../src/cli.js';

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('my add tenancy (Phase 5)', () => {
  let dir: string;
  let previousCwd: string;

  beforeEach(() => {
    previousCwd = process.cwd();
  });

  afterEach(async () => {
    process.chdir(previousCwd);
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  async function scaffoldProject() {
    dir = await mkdtemp(join(tmpdir(), 'mycli-tenancy-'));
    process.chdir(dir);
    await writeFile(
      join(dir, '.myclirc.json'),
      JSON.stringify({
        version: '1.0.0',
        projectName: 'demo',
        language: 'typescript',
        paths: { tenancy: 'src/tenancy' },
      }),
    );
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'demo', version: '1.0.0', type: 'module' }),
    );
  }

  it('adds single-tenant module', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run(['add', 'tenancy', '--model', 'single-tenant']);
    expect(result.exitCode).toBe(0);

    expect(await pathExists(join(dir, 'src/tenancy/entities/Tenant.ts'))).toBe(true);
    const middleware = await readFile(join(dir, 'src/tenancy/tenant.middleware.ts'), 'utf8');
    expect(middleware).toContain('Single-tenant');

    const config = JSON.parse(await readFile(join(dir, '.myclirc.json'), 'utf8'));
    expect(config.features.tenancy).toBe(true);
    expect(config.extensions.tenantModel).toBe('single-tenant');

    await cli.shutdown();
  });

  it('adds multi-tenant shared-db with tenant filter and migration', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run([
      'add',
      'tenancy',
      '--model',
      'multi-tenant-saas',
      '--mode',
      'shared-db',
    ]);
    expect(result.exitCode).toBe(0);

    expect(await pathExists(join(dir, 'src/tenancy/tenant-filter.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'migrations/tenancy/001_add_tenant_id_columns.sql'))).toBe(
      true,
    );
    expect(await pathExists(join(dir, 'TENANCY.md'))).toBe(true);

    const config = JSON.parse(await readFile(join(dir, '.myclirc.json'), 'utf8'));
    expect(config.extensions.tenancyStrategy).toBe('shared-db');
    expect(config.extensions.tenancyMode).toBe('single-db');

    await cli.shutdown();
  });

  it('adds schema-per-tenant with schema manager', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run([
      'add',
      'tenancy',
      '--model',
      'multi-tenant-saas',
      '--mode',
      'schema-per-tenant',
    ]);
    expect(result.exitCode).toBe(0);

    expect(await pathExists(join(dir, 'src/tenancy/schema/schema-manager.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/tenancy/schema/tenant-schema.service.ts'))).toBe(true);

    await cli.shutdown();
  });

  it('adds db-per-tenant with connection manager and migration runner', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run([
      'add',
      'tenancy',
      '--model',
      'multi-tenant-saas',
      '--mode',
      'db-per-tenant',
    ]);
    expect(result.exitCode).toBe(0);

    expect(await pathExists(join(dir, 'src/tenancy/database/tenant-connection-manager.ts'))).toBe(
      true,
    );
    expect(await pathExists(join(dir, 'src/tenancy/database/tenant-provisioning.service.ts'))).toBe(
      true,
    );
    expect(await pathExists(join(dir, 'src/tenancy/database/tenant-migration-runner.ts'))).toBe(
      true,
    );

    await cli.shutdown();
  });
});
