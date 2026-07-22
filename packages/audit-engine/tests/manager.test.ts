import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSystem } from '@mycli-cli/filesystem';
import { createTemplateEngine } from '@mycli-cli/template-engine';
import { afterEach, describe, expect, it } from 'vitest';
import { createAuditManager } from '../src/manager.js';

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('AuditManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('scaffolds memory-backed audit platform', async () => {
    dir = await mkdtemp(join(tmpdir(), 'audit-engine-'));
    const fs = createFileSystem(dir);
    const templatesRoot = join(import.meta.dirname, '../../../apps/cli/templates');
    const manager = createAuditManager({
      cwd: dir,
      filesystem: fs,
      templateEngine: createTemplateEngine({ filesystem: fs, templatesRoot }),
      templatesRoot,
    });

    const result = await manager.setup({
      appName: 'demo',
      storage: 'memory',
      language: 'typescript',
    });

    expect(result.files.length).toBeGreaterThan(8);
    expect(await pathExists(join(dir, 'src/audit/audit.service.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/audit/audit.middleware.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/audit/storage/memory-audit.storage.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'tests/audit/audit.test.ts'))).toBe(true);

    const service = await readFile(join(dir, 'src/audit/audit.service.ts'), 'utf8');
    expect(service).toContain('computeStateDiff');
  });

  it('scaffolds file-backed audit storage', async () => {
    dir = await mkdtemp(join(tmpdir(), 'audit-engine-file-'));
    const fs = createFileSystem(dir);
    const templatesRoot = join(import.meta.dirname, '../../../apps/cli/templates');
    const manager = createAuditManager({
      cwd: dir,
      filesystem: fs,
      templateEngine: createTemplateEngine({ filesystem: fs, templatesRoot }),
      templatesRoot,
    });

    await manager.setup({ appName: 'corp', storage: 'file', language: 'typescript' });
    expect(await pathExists(join(dir, 'src/audit/storage/file-audit.storage.ts'))).toBe(true);
  });
});
