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

describe('my add feature-flags (Phase 10)', () => {
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
    dir = await mkdtemp(join(tmpdir(), 'mycli-ff-'));
    process.chdir(dir);
    await writeFile(
      join(dir, '.myclirc.json'),
      JSON.stringify({
        version: '1.0.0',
        projectName: 'demo',
        language: 'typescript',
        paths: { featureFlags: 'src/feature-flags' },
      }),
    );
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'demo', version: '1.0.0', type: 'module' }),
    );
  }

  it('adds database feature flags with targeting', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run(['add', 'feature-flags', '--provider', 'database']);
    expect(result.exitCode).toBe(0);

    expect(await pathExists(join(dir, 'src/feature-flags/feature-flag.service.ts'))).toBe(true);
    expect(
      await pathExists(join(dir, 'src/feature-flags/feature-flag-provider.interface.ts')),
    ).toBe(true);
    expect(await pathExists(join(dir, 'src/feature-flags/targeting/evaluate.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/feature-flags/providers/database.provider.ts'))).toBe(
      true,
    );
    expect(await pathExists(join(dir, 'config/feature-flags.json'))).toBe(true);
    expect(await pathExists(join(dir, 'FEATURE_FLAGS.md'))).toBe(true);

    const evaluate = await readFile(join(dir, 'src/feature-flags/targeting/evaluate.ts'), 'utf8');
    expect(evaluate).toContain('userTargets');
    expect(evaluate).toContain('percentage');
    expect(evaluate).toContain('environments');
    expect(evaluate).toContain('countries');

    const config = JSON.parse(await readFile(join(dir, '.myclirc.json'), 'utf8'));
    expect(config.features['feature-flags']).toBe(true);
    expect(config.extensions.featureFlagProvider).toBe('database');

    await cli.shutdown();
  });

  it('adds unleash provider scaffold', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run(['add', 'flags', '--provider', 'unleash']);
    expect(result.exitCode).toBe(0);

    expect(await pathExists(join(dir, 'src/feature-flags/providers/unleash.provider.ts'))).toBe(
      true,
    );
    const register = await readFile(
      join(dir, 'src/feature-flags/register-feature-flags.ts'),
      'utf8',
    );
    expect(register).toContain('UnleashFeatureFlagProvider');

    const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
    expect(pkg.dependencies['unleash-client']).toBeTruthy();

    await cli.shutdown();
  });
});
