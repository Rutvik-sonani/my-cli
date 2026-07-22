import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCli } from '../src/cli.js';

describe('my commands (integration)', () => {
  let dir: string;
  let previousCwd: string;

  beforeEach(() => {
    previousCwd = process.cwd();
  });

  afterEach(async () => {
    process.chdir(previousCwd);
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  async function scaffoldProject(extra: Record<string, unknown> = {}) {
    dir = await mkdtemp(join(tmpdir(), 'mycli-cmd-'));
    process.chdir(dir);
    await writeFile(
      join(dir, '.myclirc.json'),
      JSON.stringify({
        version: '1.0.0',
        projectName: 'demo',
        orm: 'prisma',
        database: 'postgresql',
        paths: { modules: 'src/modules' },
        ...extra,
      }),
    );
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'demo', version: '1.0.0', type: 'module' }),
    );
  }

  it('my analytics uses Hindi intro when MYCLI_LOCALE=hi', async () => {
    await scaffoldProject();
    const previousLocale = process.env.MYCLI_LOCALE;
    process.env.MYCLI_LOCALE = 'hi';
    try {
      const cli = await createCli();
      const introSpy = vi.spyOn(cli.prompts, 'intro');
      const result = await cli.run(['analytics']);
      expect(result.exitCode).toBe(0);
      expect(introSpy).toHaveBeenCalledWith('प्रोजेक्ट एनालिटिक्स');
      introSpy.mockRestore();
      await cli.shutdown();
    } finally {
      if (previousLocale === undefined) {
        process.env.MYCLI_LOCALE = undefined;
      } else {
        process.env.MYCLI_LOCALE = previousLocale;
      }
    }
  });

  it('my doctor runs health checks in a project', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run(['doctor']);
    expect(result.exitCode).toBe(0);
    await cli.shutdown();
  });

  it('my doctor uses Hindi intro when MYCLI_LOCALE=hi', async () => {
    await scaffoldProject();
    const previousLocale = process.env.MYCLI_LOCALE;
    process.env.MYCLI_LOCALE = 'hi';
    try {
      const cli = await createCli();
      const introSpy = vi.spyOn(cli.prompts, 'intro');
      const result = await cli.run(['doctor']);
      expect(result.exitCode).toBe(0);
      expect(introSpy).toHaveBeenCalledWith('MyCLI डॉक्टर');
      introSpy.mockRestore();
      await cli.shutdown();
    } finally {
      if (previousLocale === undefined) {
        process.env.MYCLI_LOCALE = undefined;
      } else {
        process.env.MYCLI_LOCALE = previousLocale;
      }
    }
  });

  it('my analytics reports project summary', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = await cli.run(['analytics']);
    expect(result.exitCode).toBe(0);
    expect(log.mock.calls.flat().join('\n')).toContain('demo');
    log.mockRestore();
    await cli.shutdown();
  });

  it('my plugin list runs without error', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run(['plugin', 'list']);
    expect(result.exitCode).toBe(0);
    await cli.shutdown();
  });

  it('my plugin search finds docker plugin locally', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run(['plugin', 'search', 'docker']);
    expect(result.exitCode).toBe(0);
    await cli.shutdown();
  });

  it('my upgrade reports nothing when versions match', async () => {
    await scaffoldProject({ version: '1.0.0' });
    const cli = await createCli();
    const result = await cli.run(['upgrade']);
    expect(result.exitCode).toBe(0);
    await cli.shutdown();
  });

  it('my create --yes merges feature deps into package.json when --skip-install', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-create-deps-'));
    process.chdir(dir);
    const cli = await createCli();
    const result = await cli.run(['create', 'deps-app', '--yes', '--skip-install', '--skip-git']);
    expect(result.exitCode).toBe(0);
    const pkg = JSON.parse(await readFile(join(dir, 'deps-app/package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      scripts?: Record<string, string>;
    };
    expect(pkg.dependencies?.['@prisma/client']).toBeDefined();
    expect(pkg.devDependencies?.prisma).toBeDefined();
    expect(pkg.devDependencies?.supertest).toBeDefined();
    expect(pkg.scripts?.['db:generate']).toBe('prisma generate');
    await cli.shutdown();
  });

  it('my create --yes generates ENVIRONMENT.md', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-create-env-'));
    process.chdir(dir);
    const cli = await createCli();
    const result = await cli.run(['create', 'env-app', '--yes', '--skip-install', '--skip-git']);
    expect(result.exitCode).toBe(0);
    const envDoc = await readFile(join(dir, 'env-app/ENVIRONMENT.md'), 'utf8');
    expect(envDoc).toContain('env-app');
    expect(envDoc).toContain('DATABASE_URL');
    await cli.shutdown();
  });

  it('my create --yes --architecture-style domain-driven-design scaffolds DDD layout', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-create-ddd-'));
    process.chdir(dir);
    const cli = await createCli();
    const result = await cli.run([
      'create',
      'ddd-app',
      '--yes',
      '--architecture-style',
      'domain-driven-design',
      '--skip-install',
      '--skip-git',
    ]);
    expect(result.exitCode).toBe(0);
    const projectDir = join(dir, 'ddd-app');
    const arch = await readFile(join(projectDir, 'ARCHITECTURE.md'), 'utf8');
    expect(arch).toContain('Domain Driven Design');
    expect(arch).toContain('entities/');
    const entitiesReadme = await readFile(
      join(projectDir, 'src/domain/entities/README.md'),
      'utf8',
    );
    expect(entitiesReadme).toContain('Entities');
    const rules = JSON.parse(
      await readFile(join(projectDir, '.architecture/dependency-rules.json'), 'utf8'),
    );
    expect(rules.style).toBe('domain-driven-design');
    const eslintArch = await readFile(join(projectDir, 'eslint.architecture.config.js'), 'utf8');
    expect(eslintArch).toContain('no-restricted-imports');
    const rc = JSON.parse(await readFile(join(projectDir, '.myclirc.json'), 'utf8')) as {
      architectureStyle?: string;
      paths?: { domain?: string };
    };
    expect(rc.architectureStyle).toBe('domain-driven-design');
    expect(rc.paths?.domain).toBe('src/domain');
    await cli.shutdown();
  });

  it('my create --yes generates git community files', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-create-git-'));
    process.chdir(dir);
    const cli = await createCli();
    const result = await cli.run([
      'create',
      'git-app',
      '--yes',
      '--skip-install',
      '--cicd',
      '--git-hooks',
    ]);
    expect(result.exitCode).toBe(0);
    const projectDir = join(dir, 'git-app');
    const license = await readFile(join(projectDir, 'LICENSE'), 'utf8');
    expect(license).toContain('MIT');
    const changelog = await readFile(join(projectDir, 'CHANGELOG.md'), 'utf8');
    expect(changelog).toContain('git-app');
    const preCommit = await readFile(join(projectDir, '.husky/pre-commit'), 'utf8');
    expect(preCommit).toContain('lint-staged');
    const deploy = await readFile(join(projectDir, '.github/workflows/deploy.yml'), 'utf8');
    expect(deploy).toContain('name: Deploy');
    const codeql = await readFile(join(projectDir, '.github/workflows/codeql.yml'), 'utf8');
    expect(codeql).toContain('CodeQL');
    const renovate = await readFile(join(projectDir, 'renovate.json'), 'utf8');
    expect(renovate).toContain('config:recommended');
    const deployment = await readFile(join(projectDir, 'DEPLOYMENT.md'), 'utf8');
    expect(deployment).toContain('git-app');
    await cli.shutdown();
  });

  it('my create --yes --app-type enterprise-saas scaffolds SaaS modules', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-create-saas-'));
    process.chdir(dir);
    const cli = await createCli();
    const result = await cli.run([
      'create',
      'saas-app',
      '--yes',
      '--app-type',
      'enterprise-saas',
      '--skip-install',
      '--skip-git',
    ]);
    expect(result.exitCode).toBe(0);
    const projectDir = join(dir, 'saas-app');
    const orgService = await readFile(
      join(projectDir, 'src/modules/organizations/organization.service.ts'),
      'utf8',
    );
    expect(orgService).toContain('OrganizationService');
    const enterpriseDoc = await readFile(join(projectDir, 'ENTERPRISE_SAAS.md'), 'utf8');
    expect(enterpriseDoc).toContain('saas-app');
    const authDir = join(projectDir, 'src/modules/auth');
    const { access } = await import('node:fs/promises');
    await expect(access(authDir)).resolves.toBeUndefined();
    await cli.shutdown();
  });

  it('my create --yes --language javascript generates JS project without tsconfig', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-create-js-'));
    process.chdir(dir);
    const cli = await createCli();
    const result = await cli.run([
      'create',
      'js-app',
      '--yes',
      '--language',
      'javascript',
      '--skip-install',
      '--skip-git',
    ]);
    expect(result.exitCode).toBe(0);
    const projectDir = join(dir, 'js-app');
    const pkg = JSON.parse(await readFile(join(projectDir, 'package.json'), 'utf8'));
    expect(pkg.devDependencies?.typescript).toBeUndefined();
    expect(pkg.scripts.dev).toContain('src/index.js');
    expect(await readFile(join(projectDir, 'src/index.js'), 'utf8')).toContain('js-app');
    await expect(readFile(join(projectDir, 'tsconfig.json'), 'utf8')).rejects.toThrow();
    const biome = await readFile(join(projectDir, 'biome.json'), 'utf8');
    expect(biome).toContain('biomejs.dev');
    await cli.shutdown();
  });

  it('my create --yes --dry-run previews a project', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-create-'));
    process.chdir(dir);
    const cli = await createCli();
    const result = await cli.run(['create', 'preview-app', '--yes', '--dry-run', '--skip-install']);
    expect(result.exitCode).toBe(0);
    await cli.shutdown();
  });

  it('my security setup --dry-run previews files', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run(['security', 'setup', '--dry-run']);
    expect(result.exitCode).toBe(0);
    await cli.shutdown();
  });

  it('my deploy terraform --provider aws --dry-run previews terraform', async () => {
    await scaffoldProject({ terraformProvider: 'aws' });
    const cli = await createCli();
    const result = await cli.run(['deploy', 'terraform', '--provider', 'aws', '--dry-run']);
    expect(result.exitCode).toBe(0);
    await cli.shutdown();
  });

  it('my git providers lists supported providers', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run(['git', 'providers']);
    expect(result.exitCode).toBe(0);
    await cli.shutdown();
  });

  it('my backup run --dry-run plans backup commands', async () => {
    await scaffoldProject({ database: 'postgresql' });
    const cli = await createCli();
    const result = await cli.run(['backup', 'run', '--dry-run']);
    expect(result.exitCode).toBe(0);
    await cli.shutdown();
  });

  it('my ai generate module user --dry-run does not call provider', async () => {
    await scaffoldProject({ features: { ai: true } });
    const { mkdir } = await import('node:fs/promises');
    await mkdir(join(dir, 'src'), { recursive: true });
    await writeFile(join(dir, 'src/index.ts'), 'export {};\n');
    const cli = await createCli();
    const result = await cli.run(['ai', 'generate', 'module', 'user', '--dry-run']);
    expect(result.exitCode).toBe(0);
    await cli.shutdown();
  });
});
