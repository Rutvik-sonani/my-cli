import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createCli } from '../src/cli.js';

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('my upgrade (integration)', () => {
  let dir: string;
  let previousCwd: string;

  afterEach(async () => {
    process.chdir(previousCwd);
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('adds missing template files without overwriting modules', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-upgrade-int-'));
    previousCwd = process.cwd();
    process.chdir(dir);

    await writeFile(
      join(dir, '.myclirc.json'),
      JSON.stringify({ version: '1.0.0', projectName: 'demo', paths: { modules: 'src/modules' } }),
    );
    await mkdir(join(dir, 'src/modules/demo'), { recursive: true });
    await writeFile(join(dir, 'src/modules/demo/demo.service.ts'), 'export const demo = true;');

    const cli = await createCli();
    const result = await cli.run(['upgrade']);
    expect(result.exitCode).toBe(0);

    expect(await fileExists(join(dir, 'ENVIRONMENT.md'))).toBe(true);
    expect(await fileExists(join(dir, 'biome.json'))).toBe(true);
    const demo = await readFile(join(dir, 'src/modules/demo/demo.service.ts'), 'utf8');
    expect(demo).toContain('export const demo = true');

    await cli.shutdown();
  });
});
