import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSystem } from '@mycli-cli/filesystem';
import { createTemplateEngine } from '@mycli-cli/template-engine';
import { afterEach, describe, expect, it } from 'vitest';
import { createFeatureFlagManager } from '../src/manager.js';

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('FeatureFlagManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('scaffolds database feature flags', async () => {
    dir = await mkdtemp(join(tmpdir(), 'ff-engine-'));
    const fs = createFileSystem(dir);
    const templatesRoot = join(import.meta.dirname, '../../../apps/cli/templates');
    const manager = createFeatureFlagManager({
      cwd: dir,
      filesystem: fs,
      templateEngine: createTemplateEngine({ filesystem: fs, templatesRoot }),
      templatesRoot,
    });

    const result = await manager.setup({
      appName: 'demo',
      provider: 'database',
      language: 'typescript',
    });

    expect(result.files.length).toBeGreaterThan(8);
    expect(await pathExists(join(dir, 'src/feature-flags/feature-flag.service.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/feature-flags/providers/database.provider.ts'))).toBe(
      true,
    );
    expect(await pathExists(join(dir, 'src/feature-flags/targeting/evaluate.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'config/feature-flags.json'))).toBe(true);
    expect(await pathExists(join(dir, 'tests/feature-flags/feature-flags.test.ts'))).toBe(true);

    const flags = await readFile(join(dir, 'config/feature-flags.json'), 'utf8');
    expect(flags).toContain('new-checkout');
    expect(flags).toContain('percentage');
  });

  it('scaffolds launchdarkly provider with dependency', async () => {
    dir = await mkdtemp(join(tmpdir(), 'ff-ld-'));
    const fs = createFileSystem(dir);
    const templatesRoot = join(import.meta.dirname, '../../../apps/cli/templates');
    const manager = createFeatureFlagManager({
      cwd: dir,
      filesystem: fs,
      templateEngine: createTemplateEngine({ filesystem: fs, templatesRoot }),
      templatesRoot,
    });

    const result = await manager.setup({
      appName: 'corp',
      provider: 'launchdarkly',
      language: 'typescript',
    });

    expect(
      await pathExists(join(dir, 'src/feature-flags/providers/launchdarkly.provider.ts')),
    ).toBe(true);
    expect(result.dependencies['@launchdarkly/node-server-sdk']).toBeTruthy();
  });
});
