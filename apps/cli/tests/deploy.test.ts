import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCli } from '../src/cli.js';

describe('my deploy (integration)', () => {
  let dir: string;
  let previousCwd: string;

  beforeEach(() => {
    previousCwd = process.cwd();
  });

  afterEach(async () => {
    process.chdir(previousCwd);
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  async function scaffoldProject(extra: Record<string, unknown> = {}) {
    dir = await mkdtemp(join(tmpdir(), 'mycli-deploy-'));
    process.chdir(dir);
    await writeFile(
      join(dir, '.myclirc.json'),
      JSON.stringify({
        version: '1.0.0',
        projectName: 'demo',
        paths: { modules: 'src/modules' },
        ...extra,
      }),
    );
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'demo', version: '1.0.0', type: 'module' }),
    );
  }

  it('my deploy setup --dry-run previews cloud docs', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run(['deploy', 'setup', '--provider', 'railway', '--dry-run']);
    expect(result.exitCode).toBe(0);
    await cli.shutdown();
  });

  it('my deploy push --provider railway --dry-run previews push plan', async () => {
    await scaffoldProject();
    await writeFile(join(dir, 'railway.json'), '{}\n');
    const cli = await createCli();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await cli.run(['deploy', 'push', '--provider', 'railway', '--dry-run']);
    expect(result.exitCode).toBe(0);
    expect(log.mock.calls.flat().join('\n').length).toBeGreaterThan(0);

    log.mockRestore();
    await cli.shutdown();
  });

  it('my deploy secrets sync --dry-run previews secret sync', async () => {
    await scaffoldProject();
    await writeFile(join(dir, '.env.example'), 'API_KEY=\n');
    const cli = await createCli();

    const result = await cli.run([
      'deploy',
      'secrets',
      'sync',
      '--provider',
      'railway',
      '--dry-run',
    ]);
    expect(result.exitCode).toBe(0);
    await cli.shutdown();
  });
});
