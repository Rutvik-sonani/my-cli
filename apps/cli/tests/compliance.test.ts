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

describe('my add compliance (Phase 8)', () => {
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
    dir = await mkdtemp(join(tmpdir(), 'mycli-compliance-'));
    process.chdir(dir);
    await writeFile(
      join(dir, '.myclirc.json'),
      JSON.stringify({
        version: '1.0.0',
        projectName: 'demo',
        language: 'typescript',
        paths: { compliance: 'src/compliance' },
      }),
    );
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'demo', version: '1.0.0', type: 'module' }),
    );
  }

  it('adds compliance platform with GDPR and SOC2', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run(['add', 'compliance', '--frameworks', 'gdpr,soc2']);
    expect(result.exitCode).toBe(0);

    expect(await pathExists(join(dir, 'src/compliance/compliance.service.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/compliance/policies/gdpr.policy.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/compliance/policies/soc2.policy.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/compliance/checks/compliance-checker.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/compliance/reports/report-generator.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/compliance/documentation/data-retention.md'))).toBe(
      true,
    );
    expect(await pathExists(join(dir, 'tests/compliance/compliance.test.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'COMPLIANCE.md'))).toBe(true);

    const service = await readFile(join(dir, 'src/compliance/register-compliance.ts'), 'utf8');
    expect(service).toContain("'gdpr'");
    expect(service).toContain("'soc2'");

    const config = JSON.parse(await readFile(join(dir, '.myclirc.json'), 'utf8'));
    expect(config.features.compliance).toBe(true);
    expect(config.extensions.complianceFrameworks).toEqual(['gdpr', 'soc2']);

    await cli.shutdown();
  });

  it('adds HIPAA and ISO27001 frameworks', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run(['add', 'compliance', '--frameworks', 'hipaa,iso27001']);
    expect(result.exitCode).toBe(0);

    expect(await pathExists(join(dir, 'src/compliance/policies/hipaa.policy.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/compliance/policies/iso27001.policy.ts'))).toBe(true);
    const catalog = await readFile(join(dir, 'src/compliance/checks/check-catalog.ts'), 'utf8');
    expect(catalog).toContain('hipaa-access-control');
    expect(catalog).toContain('iso-isms');

    await cli.shutdown();
  });
});
