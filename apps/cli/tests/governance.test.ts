import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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

describe('my governance (Phase 15)', () => {
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
    dir = await mkdtemp(join(tmpdir(), 'mycli-gov-'));
    process.chdir(dir);
    await writeFile(
      join(dir, '.myclirc.json'),
      JSON.stringify({
        version: '1.0.0',
        projectName: 'demo',
        language: 'typescript',
        database: 'postgresql',
        paths: { governance: 'src/governance' },
        features: {
          docker: true,
          auth: true,
          rbac: true,
          security: true,
          audit: true,
          testing: true,
        },
      }),
    );
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({
        name: 'demo',
        version: '1.0.0',
        type: 'module',
        scripts: { test: 'vitest run' },
      }),
    );
    await writeFile(join(dir, 'Dockerfile'), 'FROM node:22\n');
    await writeFile(join(dir, 'README.md'), '# demo\n');
    await writeFile(join(dir, 'SECURITY.md'), '# security\n');
    await mkdir(join(dir, 'src/security'), { recursive: true });
    await mkdir(join(dir, 'src/audit'), { recursive: true });
    await mkdir(join(dir, 'tests'), { recursive: true });
    await mkdir(join(dir, '.github/workflows'), { recursive: true });
  }

  it('sets up company governance policy and checker', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run(['governance', 'setup', '--company', 'Acme']);
    expect(result.exitCode).toBe(0);

    expect(await pathExists(join(dir, 'src/governance/policy/company-policy.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/governance/rules/default-rules.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/governance/checker/governance.checker.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/governance/governance.service.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'company-policy.json'))).toBe(true);
    expect(await pathExists(join(dir, 'GOVERNANCE.md'))).toBe(true);
    expect(await pathExists(join(dir, 'tests/governance/governance.test.ts'))).toBe(true);

    const policy = JSON.parse(await readFile(join(dir, 'company-policy.json'), 'utf8'));
    expect(policy.company).toBe('Acme');
    expect(policy.rules.map((r: { id: string }) => r.id)).toContain('req-docker');

    const config = JSON.parse(await readFile(join(dir, '.myclirc.json'), 'utf8'));
    expect(config.features.governance).toBe(true);
    expect(config.paths.governance).toBe('src/governance');

    await cli.shutdown();
  });

  it('checks governance and writes GOVERNANCE_REPORT.md', async () => {
    await scaffoldProject();
    const cli = await createCli();
    await cli.run(['governance', 'setup', '--company', 'Acme']);
    const result = await cli.run(['governance', 'check']);
    expect(result.exitCode).toBe(0);
    expect(await pathExists(join(dir, 'GOVERNANCE_REPORT.md'))).toBe(true);

    const report = await readFile(join(dir, 'GOVERNANCE_REPORT.md'), 'utf8');
    expect(report).toContain('Compliant: yes');
    expect(report).toContain('PostgreSQL required');

    await cli.shutdown();
  });
});
