import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSystem } from '@mycli/filesystem';
import { afterEach, describe, expect, it } from 'vitest';
import { createRbacManager } from '../src/index.js';
import { assertTypeScriptParses, featureTemplatesRoot } from './helpers.js';

describe('RbacManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('generates RBAC module with prisma repository', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-rbac-'));
    const fs = createFileSystem(dir);
    const rbac = createRbacManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    const result = await rbac.setup({ orm: 'prisma' });
    expect(result.files).toContain('RBAC.md');

    const service = await readFile(join(dir, 'src/modules/rbac/rbac.service.ts'), 'utf8');
    expect(service).toContain('assignPermission');
    expect(service).toContain('hasRole');

    const repo = await readFile(join(dir, 'src/modules/rbac/rbac.repository.ts'), 'utf8');
    expect(repo).toContain('prisma.role');

    const serviceCan = await readFile(join(dir, 'src/modules/rbac/rbac.service.ts'), 'utf8');
    expect(serviceCan).toContain('ResourceContext');
    expect(serviceCan).toContain('ownerId');

    expect(await fs.exists('.mycli/sync-rbac.ts')).toBe(true);

    const barrel = await readFile(join(dir, 'src/modules/index.ts'), 'utf8');
    expect(barrel).toContain('./rbac/index.js');

    const featureRoutes = await readFile(join(dir, 'src/routes/features.ts'), 'utf8');
    expect(featureRoutes).toContain('registerRbacRoutes');
  });

  it('manages roles and permissions via CLI store', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-rbac-cli-'));
    const fs = createFileSystem(dir);
    const rbac = createRbacManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    await rbac.createRole('admin', 'Administrator');
    await rbac.createPermission('user.read');
    await rbac.assignPermission('admin', 'user.read');

    const roles = await rbac.listRoles();
    expect(roles).toHaveLength(1);
    expect(roles[0]?.name).toBe('admin');

    const permissions = await rbac.listPermissions();
    expect(permissions[0]?.name).toBe('user.read');

    const store = await fs.readJson<{
      rolePermissions: Array<{ role: string; permission: string }>;
    }>('.mycli/rbac.json');
    expect(store.rolePermissions).toEqual([{ role: 'admin', permission: 'user.read' }]);
  });

  it('generated RBAC modules and sync script parse as valid TypeScript', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-rbac-parse-'));
    const fs = createFileSystem(dir);
    const rbac = createRbacManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    const result = await rbac.setup({ orm: 'prisma' });
    const tsFiles = result.files.filter((file) => file.endsWith('.ts'));
    assertTypeScriptParses(dir, tsFiles);
  });

  it('syncToDatabase dry-run returns tsx sync command', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-rbac-sync-'));
    const fs = createFileSystem(dir);
    const rbac = createRbacManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    await rbac.setup({ orm: 'prisma' });
    await rbac.createRole('admin');
    const commands = await rbac.syncToDatabase({ dryRun: true });
    expect(commands[0]).toContain('.mycli/sync-rbac.ts');
  });

  it('generates RBAC module with typeorm repository and sync script', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-rbac-typeorm-'));
    const fs = createFileSystem(dir);
    const rbac = createRbacManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    const result = await rbac.setup({ orm: 'typeorm' });
    expect(result.dependencies.typeorm).toBeDefined();

    const repo = await readFile(join(dir, 'src/modules/rbac/rbac.repository.ts'), 'utf8');
    expect(repo).toContain('AppDataSource.getRepository');

    const sync = await readFile(join(dir, '.mycli/sync-rbac.ts'), 'utf8');
    expect(sync).toContain('AppDataSource.initialize');

    const tsFiles = result.files.filter((file) => file.endsWith('.ts'));
    assertTypeScriptParses(dir, tsFiles);
  });
});
