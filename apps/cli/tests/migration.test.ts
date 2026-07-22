import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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

describe('my upgrade (Phase 17)', () => {
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
    dir = await mkdtemp(join(tmpdir(), 'mycli-mig-'));
    process.chdir(dir);
    await writeFile(
      join(dir, '.myclirc.json'),
      JSON.stringify({
        version: '1.0.0',
        projectName: 'demo',
        language: 'typescript',
        paths: { modules: 'src/modules', migration: 'src/migration' },
      }),
    );
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'demo', version: '1.0.0', type: 'module' }),
    );
    await mkdir(join(dir, 'src/modules/demo'), { recursive: true });
    await writeFile(join(dir, 'src/modules/demo/demo.service.ts'), 'export const demo = true;');
  }

  it('sets up migration engine scaffolding', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run(['upgrade', 'setup']);
    expect(result.exitCode).toBe(0);

    expect(await pathExists(join(dir, 'src/migration/upgrade.service.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/migration/backup/backup.service.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'MIGRATION.md'))).toBe(true);

    const config = JSON.parse(await readFile(join(dir, '.myclirc.json'), 'utf8'));
    expect(config.features.migration).toBe(true);
    expect(config.paths.migration).toBe('src/migration');

    await cli.shutdown();
  });

  it('runs upgrade with backup and report without overwriting user modules', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run(['upgrade', '--scope', 'project,cli']);
    expect(result.exitCode).toBe(0);

    expect(await pathExists(join(dir, 'UPGRADE_REPORT.md'))).toBe(true);
    expect(await pathExists(join(dir, 'ENVIRONMENT.md'))).toBe(true);
    expect(await pathExists(join(dir, '.mycli/cli-upgrade-notes.md'))).toBe(true);

    const demo = await readFile(join(dir, 'src/modules/demo/demo.service.ts'), 'utf8');
    expect(demo).toContain('export const demo = true');

    const report = await readFile(join(dir, 'UPGRADE_REPORT.md'), 'utf8');
    expect(report).toContain('Upgrade Report');
    expect(report).toContain('Backup');

    await cli.shutdown();
  });
});
