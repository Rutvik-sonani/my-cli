import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSystem } from '@mycli-cli/filesystem';
import { createTemplateEngine } from '@mycli-cli/template-engine';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createDefaultCompanyPolicy,
  createDefaultCompanyRules,
  createGovernanceManager,
  createGovernanceService,
  resolveGovernancePaths,
} from '../src/index.js';

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('governance config', () => {
  it('resolves default paths', () => {
    const paths = resolveGovernancePaths();
    expect(paths.root).toBe('src/governance');
    expect(paths.policy).toBe(join('src/governance', 'policy'));
    expect(paths.rules).toBe(join('src/governance', 'rules'));
    expect(paths.checker).toBe(join('src/governance', 'checker'));
  });

  it('creates company policy with required rules', () => {
    const policy = createDefaultCompanyPolicy('Acme');
    expect(policy.company).toBe('Acme');
    expect(createDefaultCompanyRules()).toHaveLength(9);
    expect(policy.rules.map((r) => r.id)).toContain('req-database-postgres');
  });
});

describe('GovernanceService runtime', () => {
  it('marks compliant projects as passing', async () => {
    const service = createGovernanceService('Acme');
    const checker = service.createChecker();
    const report = await checker.check({
      cwd: process.cwd(),
      projectName: 'demo',
      snapshot: {
        projectName: 'demo',
        database: 'postgresql',
        features: {
          docker: true,
          auth: true,
          rbac: true,
          security: true,
          audit: true,
          testing: true,
        },
        scripts: { test: 'vitest run' },
        existingPaths: [
          'Dockerfile',
          'src/security',
          'src/audit',
          'tests',
          '.github/workflows',
          'README.md',
          'SECURITY.md',
        ],
      },
    });

    expect(report.compliant).toBe(true);
    expect(report.summary.fail).toBe(0);
    expect(report.summary.pass).toBe(9);
  });

  it('fails when required standards are missing', async () => {
    const service = createGovernanceService('Acme');
    const report = await service.checkProject({
      cwd: process.cwd(),
      snapshot: {
        projectName: 'demo',
        database: 'mysql',
        features: {},
        scripts: {},
        existingPaths: [],
      },
    });

    expect(report.compliant).toBe(false);
    expect(report.summary.fail).toBeGreaterThan(0);
    const markdown = service.createChecker().renderMarkdown(report);
    expect(markdown).toContain('Governance Report');
    expect(markdown).toContain('Compliant: no');
  });

  it('accepts tests via path or script without testing feature', async () => {
    const service = createGovernanceService('Acme');
    const report = await service.checkProject({
      cwd: process.cwd(),
      snapshot: {
        projectName: 'demo',
        database: 'postgresql',
        features: {
          docker: true,
          auth: true,
          rbac: true,
          security: true,
          audit: true,
        },
        scripts: {},
        existingPaths: [
          'Dockerfile',
          'src/security',
          'src/audit',
          'tests',
          '.github/workflows',
          'README.md',
        ],
      },
    });

    const tests = report.results.find((r) => r.ruleId === 'req-tests');
    expect(tests?.status).toBe('pass');
  });
});

describe('GovernanceManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('scaffolds governance policy, checker, and docs', async () => {
    dir = await mkdtemp(join(tmpdir(), 'gov-engine-'));
    const fs = createFileSystem(dir);
    const templatesRoot = join(import.meta.dirname, '../../../apps/cli/templates');
    const manager = createGovernanceManager({
      cwd: dir,
      filesystem: fs,
      templateEngine: createTemplateEngine({ filesystem: fs, templatesRoot }),
      templatesRoot,
    });

    const result = await manager.setup({
      appName: 'demo',
      company: 'Acme',
      language: 'typescript',
    });

    expect(result.files.length).toBeGreaterThan(8);
    expect(await pathExists(join(dir, 'src/governance/policy/company-policy.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/governance/rules/default-rules.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/governance/checker/governance.checker.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/governance/governance.service.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'tests/governance/governance.test.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'company-policy.json'))).toBe(true);
    expect(await pathExists(join(dir, 'GOVERNANCE.md'))).toBe(true);

    const policyJson = JSON.parse(await readFile(join(dir, 'company-policy.json'), 'utf8'));
    expect(policyJson.company).toBe('Acme');
    expect(policyJson.rules).toHaveLength(9);

    const service = await readFile(join(dir, 'src/governance/governance.service.ts'), 'utf8');
    expect(service).toContain('createCompanyPolicy');
  });

  it('writes GOVERNANCE_REPORT.md from project snapshot', async () => {
    dir = await mkdtemp(join(tmpdir(), 'gov-check-'));
    await writeFile(
      join(dir, '.myclirc.json'),
      JSON.stringify({
        projectName: 'demo',
        database: 'postgresql',
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
      JSON.stringify({ name: 'demo', scripts: { test: 'vitest run' } }),
    );
    await writeFile(join(dir, 'Dockerfile'), 'FROM node:22\n');
    await writeFile(join(dir, 'README.md'), '# demo\n');
    await writeFile(join(dir, 'SECURITY.md'), '# security\n');
    await mkdir(join(dir, 'src/security'), { recursive: true });
    await mkdir(join(dir, 'src/audit'), { recursive: true });
    await mkdir(join(dir, 'tests'), { recursive: true });
    await mkdir(join(dir, '.github/workflows'), { recursive: true });

    const fs = createFileSystem(dir);
    const manager = createGovernanceManager({ cwd: dir, filesystem: fs });
    const result = await manager.check({ projectName: 'demo', company: 'Acme' });

    expect(result.compliant).toBe(true);
    expect(await pathExists(join(dir, 'GOVERNANCE_REPORT.md'))).toBe(true);
    const report = await readFile(join(dir, 'GOVERNANCE_REPORT.md'), 'utf8');
    expect(report).toContain('Compliant: yes');
  });
});
