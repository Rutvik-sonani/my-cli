import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createConfigManager } from '@mycli-cli/config-manager';
import { ApplicationContext } from '@mycli-cli/core';
import { createFileSystem } from '@mycli-cli/filesystem';
import { createPluginManager } from '@mycli-cli/plugin-system';
import { afterEach, describe, expect, it } from 'vitest';

const PLUGIN_PATH = join(import.meta.dirname, '..');

describe('@community/hello-mycli', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('installs and writes greeting file', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-hello-plugin-'));
    const fs = createFileSystem(dir);
    await fs.writeJson('.myclirc.json', { version: '1.0.0', projectName: 'demo' });
    await fs.writeJson('package.json', { name: 'demo', version: '1.0.0' });

    const app = new ApplicationContext({ cwd: dir, interactive: false });
    const config = createConfigManager({ cwd: dir, filesystem: fs });
    await config.load();

    const plugins = createPluginManager({ app, config, filesystem: fs });
    const loaded = await plugins.install('@community/hello-mycli', { path: PLUGIN_PATH });

    expect(loaded.plugin.name).toBe('@community/hello-mycli');
    const greeting = await readFile(join(dir, 'HELLO_MYCLI.txt'), 'utf8');
    expect(greeting).toContain('Hello from @community/hello-mycli');
    expect(greeting).toContain('demo');
  });
});
