import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCli } from '../src/cli.js';

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('my add (Phase 3 integration)', () => {
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
    dir = await mkdtemp(join(tmpdir(), 'mycli-add-'));
    process.chdir(dir);
    await writeFile(
      join(dir, '.myclirc.json'),
      JSON.stringify({
        version: '1.0.0',
        projectName: 'demo',
        orm: 'prisma',
        database: 'postgresql',
        paths: { modules: 'src/modules' },
      }),
    );
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'demo', version: '1.0.0', type: 'module' }),
    );
  }

  it('adds auth feature with JWT modules', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run(['add', 'auth']);
    expect(result.exitCode).toBe(0);

    const tokenService = await readFile(join(dir, 'src/modules/auth/token.service.ts'), 'utf8');
    expect(tokenService).toContain('SignJWT');

    await cli.shutdown();
  });

  it('adds database with prisma schema', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run([
      'add',
      'database',
      '--orm',
      'prisma',
      '--database',
      'postgresql',
    ]);
    expect(result.exitCode).toBe(0);

    const schema = await readFile(join(dir, 'prisma/schema.prisma'), 'utf8');
    expect(schema).toContain('model User');

    await cli.shutdown();
  });

  it('adds rbac and supports role CLI', async () => {
    await scaffoldProject();
    const cli = await createCli();

    expect((await cli.run(['add', 'rbac'])).exitCode).toBe(0);
    expect((await cli.run(['role', 'create', 'admin'])).exitCode).toBe(0);
    expect((await cli.run(['permission', 'create', 'user.read'])).exitCode).toBe(0);
    expect(
      (await cli.run(['permission', 'assign', 'admin', '--permission', 'user.read'])).exitCode,
    ).toBe(0);

    const store = JSON.parse(await readFile(join(dir, '.mycli/rbac.json'), 'utf8'));
    expect(store.roles[0].name).toBe('admin');
    expect(store.rolePermissions[0]).toEqual({ role: 'admin', permission: 'user.read' });

    await cli.shutdown();
  });

  it('adds swagger docs with openapi.json', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run(['add', 'swagger', '--provider', 'swagger']);
    expect(result.exitCode).toBe(0);

    const openapi = await readFile(join(dir, 'openapi.json'), 'utf8');
    expect(openapi).toContain('openapi');

    await cli.shutdown();
  });

  it('adds testing with vitest and supertest', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run(['add', 'testing', '--unit', 'vitest', '--e2e', 'none']);
    expect(result.exitCode).toBe(0);

    const integration = await readFile(join(dir, 'tests/integration/health.test.ts'), 'utf8');
    expect(integration).toContain('supertest');

    const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
    expect(pkg.devDependencies?.supertest).toBeDefined();

    await cli.shutdown();
  });

  it('adds frontend with react scaffold under frontend/', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run(['add', 'frontend', '--framework', 'react']);
    expect(result.exitCode).toBe(0);

    expect(await pathExists(join(dir, 'frontend/package.json'))).toBe(true);
    expect(await pathExists(join(dir, 'frontend/src/App.tsx'))).toBe(true);

    const cfg = JSON.parse(await readFile(join(dir, '.myclirc.json'), 'utf8'));
    expect(cfg.features?.frontend).toBe(true);
    expect(cfg.frontend).toBe('react');

    await cli.shutdown();
  });

  it('previews auth on --dry-run without writing files', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const successSpy = vi.spyOn(cli.prompts, 'success');

    const result = await cli.run(['add', 'auth', '--dry-run']);
    expect(result.exitCode).toBe(0);
    expect(successSpy.mock.calls.some((call) => String(call[0]).includes('Auth added'))).toBe(true);
    expect(await pathExists(join(dir, 'src/modules/auth/auth.service.ts'))).toBe(false);
    expect(await pathExists(join(dir, 'src/modules/auth/token.service.ts'))).toBe(false);

    successSpy.mockRestore();
    await cli.shutdown();
  });

  it('previews rbac on --dry-run without writing files', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const successSpy = vi.spyOn(cli.prompts, 'success');

    const result = await cli.run(['add', 'rbac', '--dry-run']);
    expect(result.exitCode).toBe(0);
    expect(successSpy.mock.calls.some((call) => String(call[0]).includes('RBAC added'))).toBe(true);
    expect(await pathExists(join(dir, 'src/modules/rbac/rbac.service.ts'))).toBe(false);
    expect(await pathExists(join(dir, '.mycli/sync-rbac.ts'))).toBe(false);

    successSpy.mockRestore();
    await cli.shutdown();
  });

  it('previews database on --dry-run without writing files', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const successSpy = vi.spyOn(cli.prompts, 'success');

    const result = await cli.run([
      'add',
      'database',
      '--orm',
      'prisma',
      '--database',
      'postgresql',
      '--dry-run',
    ]);
    expect(result.exitCode).toBe(0);
    expect(
      successSpy.mock.calls.some((call) => String(call[0]).includes('Database configured')),
    ).toBe(true);
    expect(await pathExists(join(dir, 'prisma/schema.prisma'))).toBe(false);

    successSpy.mockRestore();
    await cli.shutdown();
  });
});
