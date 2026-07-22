import { type FileSystem, createFileSystem } from '@mycli-cli/filesystem';
import { type TemplateEngine, createTemplateEngine } from '@mycli-cli/template-engine';
import type { CicdProvider, CicdSetupOptions, CicdSetupResult } from './types.js';

function buildCicdData(options: CicdSetupOptions): Record<string, unknown> {
  const pm = options.packageManager ?? 'pnpm';
  return {
    appName: options.appName,
    provider: options.provider,
    nodeVersion: options.nodeVersion ?? '22',
    packageManager: pm,
    branch: options.branch ?? 'main',
    installCommand:
      pm === 'pnpm'
        ? 'pnpm install --frozen-lockfile'
        : pm === 'yarn'
          ? 'yarn install --frozen-lockfile'
          : pm === 'bun'
            ? 'bun install --frozen-lockfile'
            : 'npm ci',
    lintCommand: pm === 'npm' ? 'npm run lint' : `${pm} run lint`,
    testCommand: pm === 'npm' ? 'npm test' : `${pm} test`,
    buildCommand: pm === 'npm' ? 'npm run build' : `${pm} run build`,
  };
}

const PROVIDER_FILES: Record<CicdProvider, { template: string; out: string }> = {
  github: { template: 'features/cicd/github/ci.yml.ejs', out: '.github/workflows/ci.yml' },
  gitlab: { template: 'features/cicd/gitlab/.gitlab-ci.yml.ejs', out: '.gitlab-ci.yml' },
  azure: { template: 'features/cicd/azure/azure-pipelines.yml.ejs', out: 'azure-pipelines.yml' },
  bitbucket: {
    template: 'features/cicd/bitbucket/bitbucket-pipelines.yml.ejs',
    out: 'bitbucket-pipelines.yml',
  },
  jenkins: { template: 'features/cicd/jenkins/Jenkinsfile.ejs', out: 'Jenkinsfile' },
};

/**
 * Generates CI/CD pipeline configuration for multiple providers via EJS templates.
 */
export class CicdManager {
  private readonly fs: FileSystem;
  private readonly templates: TemplateEngine;

  constructor(
    options: {
      cwd?: string;
      filesystem?: FileSystem;
      templateEngine?: TemplateEngine;
      templatesRoot?: string;
    } = {},
  ) {
    const cwd = options.cwd ?? process.cwd();
    this.fs = options.filesystem ?? createFileSystem(cwd);
    this.templates =
      options.templateEngine ??
      createTemplateEngine({
        filesystem: this.fs,
        templatesRoot: options.templatesRoot ?? 'templates',
      });
  }

  async setup(options: CicdSetupOptions): Promise<CicdSetupResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const data = buildCicdData(options);
    const written: string[] = [];

    const providerFile = PROVIDER_FILES[options.provider];
    const content = await this.templates.renderFile(providerFile.template, { data });
    if (!options.dryRun) {
      await fs.write(providerFile.out, content);
    }
    written.push(providerFile.out);

    const doc = await this.templates.renderFile('features/cicd/CICD.md.ejs', { data });
    if (!options.dryRun) {
      await fs.write('CICD.md', doc);
    }
    written.push('CICD.md');

    return { files: written };
  }
}

export function createCicdManager(options?: {
  cwd?: string;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
}): CicdManager {
  return new CicdManager(options);
}

export type { CicdProvider, CicdSetupOptions, CicdSetupResult } from './types.js';
