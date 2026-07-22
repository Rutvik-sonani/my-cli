import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createConfigManager } from '@mycli-cli/config-manager';
import { ApplicationContext } from '@mycli-cli/core';
import { createFileSystem } from '@mycli-cli/filesystem';
import { afterEach, describe, expect, it } from 'vitest';
import { createPluginManager } from '../src/index.js';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');

describe('PluginManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('loads official plugin from repo path via install path option', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-plugin-sys-'));
    const app = new ApplicationContext({ cwd: dir, interactive: false });
    const config = createConfigManager({ cwd: dir, filesystem: createFileSystem(dir) });
    await config.loadOrCreate({ version: '1.0.0', projectName: 'demo' });
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'demo', version: '1.0.0' }));

    const plugins = createPluginManager({ app, config, filesystem: createFileSystem(dir) });
    const pluginPath = join(REPO_ROOT, 'plugins', 'official', 'docker');

    const loaded = await plugins.install('@mycli-cli/docker', { path: pluginPath });
    expect(loaded.plugin.name).toBe('@mycli-cli/docker');
    expect(loaded.plugin.version).toBe('1.0.0');
  });
});
