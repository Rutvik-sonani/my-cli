import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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

describe('my docs (Phase 19)', () => {
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
    dir = await mkdtemp(join(tmpdir(), 'mycli-docs-'));
    process.chdir(dir);
    await writeFile(
      join(dir, '.myclirc.json'),
      JSON.stringify({
        version: '1.0.0',
        projectName: 'demo',
        language: 'typescript',
        architectureStyle: 'modular-monolith',
        database: 'postgresql',
        paths: { documentation: 'src/documentation' },
        features: { auth: true, security: true },
      }),
    );
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'demo', version: '1.0.0', type: 'module' }),
    );
  }

  it('sets up documentation tooling', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run(['docs', 'setup']);
    expect(result.exitCode).toBe(0);

    expect(await pathExists(join(dir, 'src/documentation/documentation.service.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'DOCUMENTATION.md'))).toBe(true);

    const config = JSON.parse(await readFile(join(dir, '.myclirc.json'), 'utf8'));
    expect(config.features.documentation).toBe(true);
    expect(config.paths.documentation).toBe('src/documentation');

    await cli.shutdown();
  });

  it('lists and generates enterprise documentation set', async () => {
    await scaffoldProject();
    const cli = await createCli();

    const list = await cli.run(['docs', 'list']);
    expect(list.exitCode).toBe(0);

    const generate = await cli.run(['docs', 'generate']);
    expect(generate.exitCode).toBe(0);

    for (const file of [
      'ARCHITECTURE.md',
      'SECURITY.md',
      'COMPLIANCE.md',
      'OPERATIONS.md',
      'SCALING.md',
      'DISASTER_RECOVERY.md',
      'API_GUIDE.md',
    ]) {
      expect(await pathExists(join(dir, file))).toBe(true);
    }

    const architecture = await readFile(join(dir, 'ARCHITECTURE.md'), 'utf8');
    expect(architecture).toContain('modular-monolith');
    expect(architecture).toContain('postgresql');

    const again = await cli.run(['docs', 'generate']);
    expect(again.exitCode).toBe(0);
    // second run should skip existing files (no force)

    await cli.shutdown();
  });
});
