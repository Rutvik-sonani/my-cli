import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createCli } from '../src/cli.js';

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('my add audit (Phase 7)', () => {
  let dir: string;
  let previousCwd: string;

  beforeEach(() => {
    previousCwd = process.cwd();
  });

  afterEach(async () => {
    process.chdir(previousCwd);
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  async function scaffoldProject() {
    dir = await mkdtemp(join(tmpdir(), 'mycli-audit-'));
    process.chdir(dir);
    await writeFile(
      join(dir, '.myclirc.json'),
      JSON.stringify({
        version: '1.0.0',
        projectName: 'demo',
        language: 'typescript',
        paths: { audit: 'src/audit' },
      }),
    );
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'demo', version: '1.0.0', type: 'module' }),
    );
  }

  it('adds audit platform with memory storage', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run(['add', 'audit', '--storage', 'memory']);
    expect(result.exitCode).toBe(0);

    expect(await pathExists(join(dir, 'src/audit/audit.service.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/audit/audit.repository.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/audit/audit.middleware.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/audit/storage/memory-audit.storage.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'tests/audit/audit.test.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'AUDIT.md'))).toBe(true);

    const service = await readFile(join(dir, 'src/audit/audit.service.ts'), 'utf8');
    expect(service).toContain('beforeState');
    expect(service).toContain('afterState');
    expect(service).toContain('computeStateDiff');

    const testFile = await readFile(join(dir, 'tests/audit/audit.test.ts'), 'utf8');
    expect(testFile).toContain("role: 'customer'");
    expect(testFile).toContain("role: 'admin'");

    const config = JSON.parse(await readFile(join(dir, '.myclirc.json'), 'utf8'));
    expect(config.features.audit).toBe(true);
    expect(config.extensions.auditStorage).toBe('memory');

    await cli.shutdown();
  });

  it('adds file-backed audit storage', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run(['add', 'audit', '--storage', 'file']);
    expect(result.exitCode).toBe(0);

    expect(await pathExists(join(dir, 'src/audit/storage/file-audit.storage.ts'))).toBe(true);
    const register = await readFile(join(dir, 'src/audit/register-audit.ts'), 'utf8');
    expect(register).toContain('FileAuditStorage');

    await cli.shutdown();
  });
});
