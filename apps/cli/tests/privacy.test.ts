import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
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

describe('my add privacy + my privacy (Phase 9)', () => {
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
    dir = await mkdtemp(join(tmpdir(), 'mycli-privacy-'));
    process.chdir(dir);
    await writeFile(
      join(dir, '.myclirc.json'),
      JSON.stringify({
        version: '1.0.0',
        projectName: 'demo',
        language: 'typescript',
        paths: { privacy: 'src/privacy' },
      }),
    );
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'demo', version: '1.0.0', type: 'module' }),
    );
  }

  it('adds privacy platform scaffold', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run(['add', 'privacy']);
    expect(result.exitCode).toBe(0);

    expect(await pathExists(join(dir, 'src/privacy/privacy.service.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/privacy/consent/consent.service.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/privacy/cookies/cookie-tracker.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/privacy/processing/processing-registry.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/privacy/export/data-exporter.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/privacy/deletion/data-deleter.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'tests/privacy/privacy.test.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'PRIVACY.md'))).toBe(true);

    const service = await readFile(join(dir, 'src/privacy/privacy.service.ts'), 'utf8');
    expect(service).toContain('exportUserData');
    expect(service).toContain('deleteUserData');

    const config = JSON.parse(await readFile(join(dir, '.myclirc.json'), 'utf8'));
    expect(config.features.privacy).toBe(true);

    await cli.shutdown();
  });

  it('exports and deletes user data via my privacy', async () => {
    await scaffoldProject();
    const cli = await createCli();
    await cli.run(['add', 'privacy']);

    await mkdir(join(dir, 'data'), { recursive: true });
    await writeFile(
      join(dir, 'data', 'privacy-users.json'),
      JSON.stringify({ 'user-9': { email: 'priv@example.com', name: 'Pat' } }, null, 2),
    );

    const exportResult = await cli.run([
      'privacy',
      'export',
      '--user',
      'user-9',
      '--output',
      './data/privacy-exports',
    ]);
    expect(exportResult.exitCode).toBe(0);

    const exports = await readdir(join(dir, 'data', 'privacy-exports'));
    expect(exports.some((name) => name.startsWith('user-9-'))).toBe(true);

    const deleteResult = await cli.run(['privacy', 'delete', '--user', 'user-9']);
    expect(deleteResult.exitCode).toBe(0);

    const seed = JSON.parse(await readFile(join(dir, 'data', 'privacy-users.json'), 'utf8'));
    expect(seed['user-9']).toBeUndefined();

    await cli.shutdown();
  });
});
