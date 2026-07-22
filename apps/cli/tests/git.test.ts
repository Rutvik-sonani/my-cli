import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCli } from '../src/cli.js';

describe('my git (integration)', () => {
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
    dir = await mkdtemp(join(tmpdir(), 'mycli-git-'));
    process.chdir(dir);
    await writeFile(
      join(dir, '.myclirc.json'),
      JSON.stringify({
        version: '1.0.0',
        projectName: 'demo',
        gitProvider: 'github',
        paths: { modules: 'src/modules' },
      }),
    );
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'demo', version: '1.0.0', type: 'module' }),
    );
  }

  it('my git remote create --dry-run previews provider commands', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await cli.run([
      'git',
      'remote',
      'create',
      '--provider',
      'github',
      '--name',
      'demo',
      '--dry-run',
    ]);
    expect(result.exitCode).toBe(0);
    expect(log.mock.calls.flat().join('\n')).toMatch(/Planned commands|gh repo create/i);

    log.mockRestore();
    await cli.shutdown();
  });

  it('my git push --dry-run previews push command', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await cli.run(['git', 'push', '--branch', 'main', '--dry-run']);
    expect(result.exitCode).toBe(0);
    expect(log.mock.calls.flat().join('\n')).toMatch(/git push|Planned commands/i);

    log.mockRestore();
    await cli.shutdown();
  });
});
