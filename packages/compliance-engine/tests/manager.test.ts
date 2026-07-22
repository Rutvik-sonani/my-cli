import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSystem } from '@mycli-cli/filesystem';
import { createTemplateEngine } from '@mycli-cli/template-engine';
import { afterEach, describe, expect, it } from 'vitest';
import { createComplianceManager } from '../src/manager.js';

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('ComplianceManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('scaffolds GDPR + SOC2 compliance platform', async () => {
    dir = await mkdtemp(join(tmpdir(), 'compliance-engine-'));
    const fs = createFileSystem(dir);
    const templatesRoot = join(import.meta.dirname, '../../../apps/cli/templates');
    const manager = createComplianceManager({
      cwd: dir,
      filesystem: fs,
      templateEngine: createTemplateEngine({ filesystem: fs, templatesRoot }),
      templatesRoot,
    });

    const result = await manager.setup({
      appName: 'demo',
      frameworks: ['gdpr', 'soc2'],
      language: 'typescript',
    });

    expect(result.files.length).toBeGreaterThan(10);
    expect(await pathExists(join(dir, 'src/compliance/compliance.service.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/compliance/policies/gdpr.policy.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/compliance/policies/soc2.policy.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/compliance/checks/check-catalog.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/compliance/reports/report-generator.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/compliance/documentation/privacy-policy.md'))).toBe(
      true,
    );
    expect(await pathExists(join(dir, 'tests/compliance/compliance.test.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'COMPLIANCE.md'))).toBe(true);

    const catalog = await readFile(join(dir, 'src/compliance/checks/check-catalog.ts'), 'utf8');
    expect(catalog).toContain('gdpr-retention');
    expect(catalog).toContain('soc2-access');
    expect(catalog).not.toContain('hipaa-access-control');
  });

  it('scaffolds all frameworks when requested', async () => {
    dir = await mkdtemp(join(tmpdir(), 'compliance-engine-all-'));
    const fs = createFileSystem(dir);
    const templatesRoot = join(import.meta.dirname, '../../../apps/cli/templates');
    const manager = createComplianceManager({
      cwd: dir,
      filesystem: fs,
      templateEngine: createTemplateEngine({ filesystem: fs, templatesRoot }),
      templatesRoot,
    });

    await manager.setup({
      appName: 'corp',
      frameworks: ['gdpr', 'hipaa', 'soc2', 'iso27001'],
      language: 'typescript',
    });

    expect(await pathExists(join(dir, 'src/compliance/policies/hipaa.policy.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/compliance/policies/iso27001.policy.ts'))).toBe(true);
  });
});
