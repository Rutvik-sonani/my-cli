import { type FileSystem, createFileSystem } from '@mycli-cli/filesystem';
import { type TemplateEngine, createTemplateEngine } from '@mycli-cli/template-engine';
import {
  type GithubCreateLabelsOptions,
  type GithubCreateLabelsResult,
  createGithubLabels,
} from './labels.js';
import type { GithubSetupOptions, GithubSetupResult } from './types.js';

function buildGithubData(options: GithubSetupOptions): Record<string, unknown> {
  const pm = options.packageManager ?? 'pnpm';
  return {
    appName: options.appName,
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
    includeReleaseWorkflow: options.includeReleaseWorkflow ?? false,
    includeDeployWorkflow: options.includeDeployWorkflow ?? false,
    includeRenovate: options.includeRenovate ?? false,
  };
}

/**
 * Generates GitHub community files and workflows via EJS templates.
 */
export class GithubManager {
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

  async setup(options: GithubSetupOptions): Promise<GithubSetupResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const data = buildGithubData(options);
    const written: string[] = [];

    const files = [
      { template: 'features/github/workflows/ci.yml.ejs', out: '.github/workflows/ci.yml' },
      { template: 'features/github/workflows/codeql.yml.ejs', out: '.github/workflows/codeql.yml' },
      {
        template: 'features/github/pull_request_template.md.ejs',
        out: '.github/pull_request_template.md',
      },
      {
        template: 'features/github/ISSUE_TEMPLATE/bug.yml.ejs',
        out: '.github/ISSUE_TEMPLATE/bug.yml',
      },
      {
        template: 'features/github/ISSUE_TEMPLATE/feature.yml.ejs',
        out: '.github/ISSUE_TEMPLATE/feature.yml',
      },
      { template: 'features/github/dependabot.yml.ejs', out: '.github/dependabot.yml' },
      { template: 'features/github/SECURITY.md.ejs', out: 'SECURITY.md' },
      { template: 'features/github/CODEOWNERS.ejs', out: '.github/CODEOWNERS' },
      { template: 'features/github/LABELS.md.ejs', out: '.github/LABELS.md' },
      { template: 'features/github/GITHUB.md.ejs', out: 'GITHUB.md' },
    ];

    if (options.includeReleaseWorkflow) {
      files.push({
        template: 'features/github/workflows/release.yml.ejs',
        out: '.github/workflows/release.yml',
      });
    }

    if (options.includeDeployWorkflow) {
      files.push({
        template: 'features/github/workflows/deploy.yml.ejs',
        out: '.github/workflows/deploy.yml',
      });
    }

    if (options.includeRenovate) {
      files.push({
        template: 'features/github/renovate.json.ejs',
        out: 'renovate.json',
      });
    }

    for (const file of files) {
      const content = await this.templates.renderFile(file.template, { data });
      if (!options.dryRun) {
        await fs.write(file.out, content);
      }
      written.push(file.out);
    }

    return { files: written };
  }

  async createLabels(options: GithubCreateLabelsOptions = {}): Promise<GithubCreateLabelsResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    return createGithubLabels({ ...options, cwd });
  }
}

export function createGithubManager(options?: {
  cwd?: string;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
}): GithubManager {
  return new GithubManager(options);
}

export type { GithubSetupOptions, GithubSetupResult } from './types.js';
