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

describe('my doctor (Phase 18)', () => {
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
    dir = await mkdtemp(join(tmpdir(), 'mycli-health-'));
    process.chdir(dir);
    await writeFile(
      join(dir, '.myclirc.json'),
      JSON.stringify({
        version: '1.0.0',
        projectName: 'demo',
        language: 'typescript',
        architectureStyle: 'modular-monolith',
        paths: { projectHealth: 'src/project-health' },
        features: {
          security: true,
          auth: true,
          testing: true,
          docker: true,
          github: true,
          observability: true,
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
        dependencies: { express: '4.0.0' },
      }),
    );
    await writeFile(join(dir, 'README.md'), '# demo\n');
    await writeFile(join(dir, 'SECURITY.md'), '# security\n');
    await writeFile(join(dir, 'Dockerfile'), 'FROM node:22\n');
    await mkdir(join(dir, 'src/security'), { recursive: true });
    await mkdir(join(dir, 'src/observability'), { recursive: true });
    await mkdir(join(dir, 'tests'), { recursive: true });
    await mkdir(join(dir, '.github/workflows'), { recursive: true });
    await mkdir(join(dir, '.architecture'), { recursive: true });
    await writeFile(join(dir, '.architecture/dependency-rules.json'), '{}\n');
  }

  it('sets up project health scaffolding', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run(['doctor', 'setup']);
    expect(result.exitCode).toBe(0);

    expect(await pathExists(join(dir, 'src/project-health/health.service.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'PROJECT_HEALTH.md'))).toBe(true);

    const config = JSON.parse(await readFile(join(dir, '.myclirc.json'), 'utf8'));
    expect(config.features.projectHealth).toBe(true);
    expect(config.paths.projectHealth).toBe('src/project-health');

    await cli.shutdown();
  });

  it('runs doctor and writes project-health-report.md', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run(['doctor', '--skip-audit']);
    expect(result.exitCode).toBe(0);

    expect(await pathExists(join(dir, 'project-health-report.md'))).toBe(true);
    const report = await readFile(join(dir, 'project-health-report.md'), 'utf8');
    expect(report).toContain('Project Health Report');
    expect(report).toContain('Architecture');
    expect(report).toContain('Security');
    expect(report).toContain('Deployment');

    await cli.shutdown();
  });
});
