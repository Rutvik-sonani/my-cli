import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSystem } from '@mycli-cli/filesystem';
import { createTemplateEngine } from '@mycli-cli/template-engine';
import { afterEach, describe, expect, it } from 'vitest';
import { createPrivacyManager } from '../src/manager.js';

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('PrivacyManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('scaffolds privacy platform modules', async () => {
    dir = await mkdtemp(join(tmpdir(), 'privacy-engine-'));
    const fs = createFileSystem(dir);
    const templatesRoot = join(import.meta.dirname, '../../../apps/cli/templates');
    const manager = createPrivacyManager({
      cwd: dir,
      filesystem: fs,
      templateEngine: createTemplateEngine({ filesystem: fs, templatesRoot }),
      templatesRoot,
    });

    const result = await manager.setup({
      appName: 'demo',
      language: 'typescript',
    });

    expect(result.files.length).toBeGreaterThan(10);
    expect(await pathExists(join(dir, 'src/privacy/privacy.service.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/privacy/consent/consent.service.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/privacy/cookies/cookie-tracker.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/privacy/processing/processing-registry.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/privacy/export/data-exporter.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/privacy/deletion/data-deleter.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'tests/privacy/privacy.test.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'PRIVACY.md'))).toBe(true);

    const service = await readFile(join(dir, 'src/privacy/privacy.service.ts'), 'utf8');
    expect(service).toContain('exportUserData');
    expect(service).toContain('deleteUserData');
  });
});
