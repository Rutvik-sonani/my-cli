import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSystem } from '@mycli/filesystem';
import { createTemplateEngine } from '@mycli/template-engine';
import { afterEach, describe, expect, it } from 'vitest';
import { createSecurityManager } from '../src/manager.js';

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('SecurityManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('scaffolds security platform modules', async () => {
    dir = await mkdtemp(join(tmpdir(), 'sec-engine-'));
    const fs = createFileSystem(dir);
    const templatesRoot = join(import.meta.dirname, '../../../apps/cli/templates');
    const manager = createSecurityManager({
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
    expect(result.dependencies['@fastify/helmet']).toBeTruthy();
    expect(await pathExists(join(dir, 'src/security/headers/security-headers.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/security/cors/cors.config.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/security/csrf/csrf.protection.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/security/rate-limit/rate-limiter.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/security/sanitization/sanitize.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/security/validation/validate.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'SECURITY.md'))).toBe(true);
  });

  it('writes security-report.md from scan', async () => {
    dir = await mkdtemp(join(tmpdir(), 'sec-scan-mgr-'));
    await createFileSystem(dir).write(
      'package.json',
      JSON.stringify({ name: 'corp', version: '1.0.0' }),
    );
    const fs = createFileSystem(dir);
    const templatesRoot = join(import.meta.dirname, '../../../apps/cli/templates');
    const manager = createSecurityManager({
      cwd: dir,
      filesystem: fs,
      templateEngine: createTemplateEngine({ filesystem: fs, templatesRoot }),
      templatesRoot,
    });

    const result = await manager.scan({ cwd: dir, projectName: 'corp' });
    expect(result.findingCount).toBeGreaterThan(0);
    expect(await pathExists(join(dir, 'security-report.md'))).toBe(true);
    const report = await readFile(join(dir, 'security-report.md'), 'utf8');
    expect(report).toContain('Security Report — corp');
  });
});
