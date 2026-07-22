import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCli } from '../src/cli.js';

describe('my rbac (integration)', () => {
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
    dir = await mkdtemp(join(tmpdir(), 'mycli-rbac-cmd-'));
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

  it('my rbac sync --dry-run plans database sync command', async () => {
    await scaffoldProject();
    const cli = await createCli();
    expect((await cli.run(['add', 'rbac'])).exitCode).toBe(0);

    const infoSpy = vi.spyOn(cli.prompts, 'info');
    const result = await cli.run(['rbac', 'sync', '--dry-run']);
    expect(result.exitCode).toBe(0);
    expect(infoSpy.mock.calls.some((call) => String(call[0]).includes('sync-rbac.ts'))).toBe(true);

    infoSpy.mockRestore();
    await cli.shutdown();
  });
});
