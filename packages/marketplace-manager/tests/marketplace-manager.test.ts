import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createConfigManager } from '@mycli/config-manager';
import { ApplicationContext } from '@mycli/core';
import { createFileSystem } from '@mycli/filesystem';
import { createPluginManager } from '@mycli/plugin-system';
import { createRegistryManager } from '@mycli/registry-manager';
import { afterEach, describe, expect, it } from 'vitest';
import { createMarketplaceManager } from '../src/index.js';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');

describe('MarketplaceManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  async function createMarketplace(cwd: string) {
    const app = new ApplicationContext({ cwd, interactive: false });
    const config = createConfigManager({ cwd, filesystem: createFileSystem(cwd) });
    await config.loadOrCreate({ version: '1.0.0', projectName: 'shop' });
    const plugins = createPluginManager({ app, config, filesystem: createFileSystem(cwd) });
    const registry = createRegistryManager({ repoRoot: REPO_ROOT });
    return createMarketplaceManager({
      registry,
      plugins,
      repoRoot: REPO_ROOT,
      cwd,
      cliVersion: '1.0.0',
    });
  }

  it('installs docker plugin from official registry', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-marketplace-'));
    const fs = createFileSystem(dir);
    await fs.writeJson('.myclirc.json', {
      version: '1.0.0',
      projectName: 'shop',
      paths: { modules: 'src/modules' },
    });
    await fs.writeJson('package.json', { name: 'shop', version: '1.0.0', type: 'module' });

    const marketplace = await createMarketplace(dir);
    const result = await marketplace.install({ name: '@mycli/docker' });

    expect(result.name).toBe('@mycli/docker');
    expect(result.path).toContain('plugins/installed/docker');
  });

  it('supports dry-run install', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-marketplace-dry-'));
    const fs = createFileSystem(dir);
    await fs.writeJson('.myclirc.json', { version: '1.0.0', projectName: 'shop' });

    const marketplace = await createMarketplace(dir);
    const result = await marketplace.install({ name: '@mycli/github', dryRun: true });
    expect(result.message).toContain('Would install');
  });
});
