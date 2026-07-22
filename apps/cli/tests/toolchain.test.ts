import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSystem } from '@mycli/filesystem';
import { createTemplateEngine } from '@mycli/template-engine';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveTemplatesRoot } from '../src/paths.js';
import { setupNodeToolchain } from '../src/utils/toolchain.js';

describe('setupNodeToolchain', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  async function scaffold() {
    dir = await mkdtemp(join(tmpdir(), 'mycli-toolchain-'));
    const fs = createFileSystem(dir);
    const templates = createTemplateEngine({
      filesystem: fs,
      templatesRoot: resolveTemplatesRoot(),
    });
    return { fs, templates };
  }

  it('writes .nvmrc for nvm', async () => {
    const { fs, templates } = await scaffold();
    const result = await setupNodeToolchain(fs, templates, { toolchain: 'nvm', nodeVersion: '22' });
    expect(result.files).toContain('.nvmrc');
    expect(await readFile(join(dir, '.nvmrc'), 'utf8')).toBe('22\n');
  });

  it('writes .tool-versions for asdf', async () => {
    const { fs, templates } = await scaffold();
    const result = await setupNodeToolchain(fs, templates, {
      toolchain: 'asdf',
      nodeVersion: '22',
    });
    expect(result.files).toContain('.tool-versions');
    const content = await readFile(join(dir, '.tool-versions'), 'utf8');
    expect(content).toContain('nodejs 22');
  });

  it('returns volta patch for package.json', async () => {
    const { fs, templates } = await scaffold();
    const result = await setupNodeToolchain(fs, templates, {
      toolchain: 'volta',
      nodeVersion: '22',
    });
    expect(result.packageJsonPatch?.volta).toEqual({ node: '22.0.0' });
    expect(result.files).toContain('package.json#volta');
  });
});
