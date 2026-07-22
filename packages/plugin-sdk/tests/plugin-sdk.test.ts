import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSystem } from '@mycli-cli/filesystem';
import { afterEach, describe, expect, it } from 'vitest';
import { createPluginScaffold, npmPackageFromName, validatePluginManifest } from '../src/index.js';

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('plugin-sdk', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('validates plugin manifest', () => {
    const manifest = validatePluginManifest({
      name: '@mycli-cli/plugin-demo',
      version: '1.0.0',
    });
    expect(manifest.name).toBe('@mycli-cli/plugin-demo');
  });

  it('maps npm package names', () => {
    expect(npmPackageFromName('@mycli-cli/billing')).toBe('@mycli-cli/plugin-billing');
  });

  it('scaffolds plugin files', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-sdk-'));
    const outputDir = join(dir, 'billing');
    const fs = createFileSystem(dir);
    const result = await createPluginScaffold({
      name: '@mycli-cli/billing',
      description: 'Billing plugin',
      outputDir,
      filesystem: fs,
    });

    expect(result.files.length).toBeGreaterThan(0);
    expect(await fileExists(join(outputDir, 'plugin.json'))).toBe(true);
    expect(await fileExists(join(outputDir, 'src/index.ts'))).toBe(true);

    const pluginJson = JSON.parse(await readFile(join(outputDir, 'plugin.json'), 'utf8'));
    expect(pluginJson.npmPackage).toBe('@mycli-cli/plugin-billing');
  });
});
