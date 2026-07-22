import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSystem } from '@mycli-cli/filesystem';
import { createTemplateEngine } from '@mycli-cli/template-engine';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ALL_HEALTH_CATEGORIES,
  createProjectHealthAnalyzer,
  createProjectHealthManager,
  resolveProjectHealthPaths,
} from '../src/index.js';

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('project health config', () => {
  it('resolves paths and categories', () => {
    const paths = resolveProjectHealthPaths();
    expect(paths.root).toBe('src/project-health');
    expect(paths.analyzers).toBe(join('src/project-health', 'analyzers'));
    expect(ALL_HEALTH_CATEGORIES).toContain('architecture');
    expect(ALL_HEALTH_CATEGORIES).toContain('performance');
  });
});

describe('ProjectHealthAnalyzer', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('analyzes categories and writes project-health-report.md', async () => {
    dir = await mkdtemp(join(tmpdir(), 'health-'));
    const fs = createFileSystem(dir);
    await fs.writeJson('.myclirc.json', {
      version: '1.0.0',
      projectName: 'demo',
      architectureStyle: 'modular-monolith',
      features: {
        security: true,
        auth: true,
        testing: true,
        docker: true,
        github: true,
        observability: true,
      },
    });
    await fs.writeJson('package.json', {
      name: 'demo',
      scripts: { test: 'vitest run' },
      dependencies: { express: '4.0.0' },
    });
    await writeFile(join(dir, 'README.md'), '# demo\n');
    await writeFile(join(dir, 'SECURITY.md'), '# security\n');
    await writeFile(join(dir, 'Dockerfile'), 'FROM node:22\n');
    await mkdir(join(dir, 'src/security'), { recursive: true });
    await mkdir(join(dir, 'tests'), { recursive: true });
    await mkdir(join(dir, '.github/workflows'), { recursive: true });
    await mkdir(join(dir, '.architecture'), { recursive: true });
    await writeFile(join(dir, '.architecture/dependency-rules.json'), '{}\n');
    await mkdir(join(dir, 'src/observability'), { recursive: true });

    const analyzer = createProjectHealthAnalyzer({ cwd: dir, filesystem: fs });
    const { report, reportPath, markdown } = await analyzer.analyze({ projectName: 'demo' });

    expect(reportPath).toBe('project-health-report.md');
    expect(report.score).toBeGreaterThanOrEqual(70);
    expect(report.readyForProduction).toBe(true);
    expect(report.findings.some((f) => f.category === 'architecture')).toBe(true);
    expect(report.findings.some((f) => f.category === 'security')).toBe(true);
    expect(report.findings.some((f) => f.category === 'testing')).toBe(true);
    expect(report.findings.some((f) => f.category === 'deployment')).toBe(true);
    expect(markdown).toContain('Project Health Report');
    expect(await pathExists(join(dir, 'project-health-report.md'))).toBe(true);
  });

  it('flags missing security and tests as fail', async () => {
    dir = await mkdtemp(join(tmpdir(), 'health-fail-'));
    const fs = createFileSystem(dir);
    await fs.writeJson('.myclirc.json', { projectName: 'weak', features: {} });
    await fs.writeJson('package.json', { name: 'weak', dependencies: {} });

    const analyzer = createProjectHealthAnalyzer({ cwd: dir, filesystem: fs });
    const { report } = await analyzer.analyze({ dryRun: true });

    expect(report.summary.fail).toBeGreaterThan(0);
    expect(report.readyForProduction).toBe(false);
    expect(report.findings.find((f) => f.id === 'sec-platform')?.status).toBe('fail');
    expect(report.findings.find((f) => f.id === 'test-suite')?.status).toBe('fail');
    expect(await pathExists(join(dir, 'project-health-report.md'))).toBe(false);
  });
});

describe('ProjectHealthManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('scaffolds project health sources', async () => {
    dir = await mkdtemp(join(tmpdir(), 'health-setup-'));
    const fs = createFileSystem(dir);
    const templatesRoot = join(import.meta.dirname, '../../../apps/cli/templates');
    const manager = createProjectHealthManager({
      cwd: dir,
      filesystem: fs,
      templateEngine: createTemplateEngine({ filesystem: fs, templatesRoot }),
      templatesRoot,
    });

    const result = await manager.setup({ appName: 'demo', language: 'typescript' });
    expect(result.files.length).toBeGreaterThan(8);
    expect(await pathExists(join(dir, 'src/project-health/health.service.ts'))).toBe(true);
    expect(
      await pathExists(join(dir, 'src/project-health/analyzers/architecture.analyzer.ts')),
    ).toBe(true);
    expect(await pathExists(join(dir, 'PROJECT_HEALTH.md'))).toBe(true);
  });
});
