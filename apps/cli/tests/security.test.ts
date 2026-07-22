import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCli } from '../src/cli.js';

describe('my security (integration)', () => {
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
    dir = await mkdtemp(join(tmpdir(), 'mycli-security-'));
    process.chdir(dir);
    await writeFile(
      join(dir, '.myclirc.json'),
      JSON.stringify({
        version: '1.0.0',
        projectName: 'demo',
        paths: { modules: 'src/modules' },
      }),
    );
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'demo', version: '1.0.0', type: 'module' }),
    );
  }

  it('my security audit runs dependency audit', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run(['security', 'audit']);
    expect(result.exitCode).toBe(0);
    await cli.shutdown();
  });

  it('my security scan-secrets reports clean project', async () => {
    await scaffoldProject();
    await mkdir(join(dir, 'src'), { recursive: true });
    await writeFile(join(dir, 'src/index.ts'), 'export const ok = true;\n');
    const cli = await createCli();
    const successSpy = vi.spyOn(cli.prompts, 'success');

    const result = await cli.run(['security', 'scan-secrets']);
    expect(result.exitCode).toBe(0);
    expect(successSpy).toHaveBeenCalled();

    successSpy.mockRestore();
    await cli.shutdown();
  });
});
