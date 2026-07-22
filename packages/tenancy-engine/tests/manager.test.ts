import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSystem } from '@mycli/filesystem';
import { createTemplateEngine } from '@mycli/template-engine';
import { afterEach, describe, expect, it } from 'vitest';
import { createTenancyManager } from '../src/manager.js';

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('TenancyManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('scaffolds single-tenant module', async () => {
    dir = await mkdtemp(join(tmpdir(), 'tenancy-engine-single-'));
    const fs = createFileSystem(dir);
    const templatesRoot = join(import.meta.dirname, '../../../apps/cli/templates');
    const manager = createTenancyManager({
      cwd: dir,
      filesystem: fs,
      templateEngine: createTemplateEngine({ filesystem: fs, templatesRoot }),
      templatesRoot,
    });

    const result = await manager.setup({
      appName: 'demo',
      model: 'single-tenant',
      strategy: 'shared-db',
      language: 'typescript',
    });

    expect(result.files.length).toBeGreaterThan(6);
    expect(await pathExists(join(dir, 'src/tenancy/entities/Tenant.ts'))).toBe(true);
    const middleware = await readFile(join(dir, 'src/tenancy/tenant.middleware.ts'), 'utf8');
    expect(middleware).toContain('Single-tenant');
  });

  it('scaffolds multi-tenant shared-db with tenant filter', async () => {
    dir = await mkdtemp(join(tmpdir(), 'tenancy-engine-shared-'));
    const fs = createFileSystem(dir);
    const templatesRoot = join(import.meta.dirname, '../../../apps/cli/templates');
    const manager = createTenancyManager({
      cwd: dir,
      filesystem: fs,
      templateEngine: createTemplateEngine({ filesystem: fs, templatesRoot }),
      templatesRoot,
    });

    await manager.setup({
      appName: 'saas',
      model: 'multi-tenant-saas',
      strategy: 'shared-db',
      language: 'typescript',
    });

    expect(await pathExists(join(dir, 'src/tenancy/tenant-filter.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'migrations/tenancy/001_add_tenant_id_columns.sql'))).toBe(
      true,
    );
  });

  it('scaffolds schema-per-tenant with schema manager', async () => {
    dir = await mkdtemp(join(tmpdir(), 'tenancy-engine-schema-'));
    const fs = createFileSystem(dir);
    const templatesRoot = join(import.meta.dirname, '../../../apps/cli/templates');
    const manager = createTenancyManager({
      cwd: dir,
      filesystem: fs,
      templateEngine: createTemplateEngine({ filesystem: fs, templatesRoot }),
      templatesRoot,
    });

    await manager.setup({
      appName: 'saas',
      model: 'multi-tenant-saas',
      strategy: 'schema-per-tenant',
      language: 'typescript',
    });

    expect(await pathExists(join(dir, 'src/tenancy/schema/schema-manager.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/tenancy/schema/tenant-schema.service.ts'))).toBe(true);
  });

  it('scaffolds db-per-tenant with connection manager', async () => {
    dir = await mkdtemp(join(tmpdir(), 'tenancy-engine-db-'));
    const fs = createFileSystem(dir);
    const templatesRoot = join(import.meta.dirname, '../../../apps/cli/templates');
    const manager = createTenancyManager({
      cwd: dir,
      filesystem: fs,
      templateEngine: createTemplateEngine({ filesystem: fs, templatesRoot }),
      templatesRoot,
    });

    await manager.setup({
      appName: 'saas',
      model: 'multi-tenant-saas',
      strategy: 'db-per-tenant',
      language: 'typescript',
    });

    expect(await pathExists(join(dir, 'src/tenancy/database/tenant-connection-manager.ts'))).toBe(
      true,
    );
    expect(await pathExists(join(dir, 'src/tenancy/database/tenant-migration-runner.ts'))).toBe(
      true,
    );
  });
});
