import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSystem } from '@mycli/filesystem';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, createConfigManager } from '../src/index.js';

describe('ConfigManager', () => {
  it('loads defaults when no config file exists', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mycli-cfg-'));
    const config = createConfigManager({ cwd: dir });
    const loaded = await config.load();
    expect(loaded.version).toBe(DEFAULT_CONFIG.version);
    expect(loaded.language).toBe('typescript');
    await rm(dir, { recursive: true, force: true });
  });

  it('loads and merges .myclirc.json', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mycli-cfg-'));
    const fs = createFileSystem(dir);
    await fs.writeJson('.myclirc.json', {
      version: '1.0.0',
      projectName: 'demo',
      features: { auth: true },
    });

    const config = createConfigManager({ cwd: dir, filesystem: fs });
    const loaded = await config.load();
    expect(loaded.projectName).toBe('demo');
    expect(config.isFeatureEnabled('auth')).toBe(true);

    config.enableFeature('docker');
    await config.save();
    const saved = await fs.readJson<{ features: Record<string, boolean> }>('.myclirc.json');
    expect(saved.features.docker).toBe(true);

    await rm(dir, { recursive: true, force: true });
  });

  it('rejects invalid language values', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mycli-cfg-'));
    const config = createConfigManager({ cwd: dir });
    await config.load();
    expect(() => config.set('language', 'python' as 'typescript')).toThrow();
    await rm(dir, { recursive: true, force: true });
  });
});
