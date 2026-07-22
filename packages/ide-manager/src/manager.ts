import { type FileSystem, createFileSystem } from '@mycli-cli/filesystem';
import { type TemplateEngine, createTemplateEngine } from '@mycli-cli/template-engine';
import type { IdeSetupOptions, IdeSetupResult } from './types.js';

function buildIdeData(options: IdeSetupOptions): Record<string, unknown> {
  const pm = options.packageManager ?? 'pnpm';
  const installCommand =
    pm === 'pnpm'
      ? 'pnpm install'
      : pm === 'yarn'
        ? 'yarn install'
        : pm === 'bun'
          ? 'bun install'
          : 'npm install';
  const devCommand = pm === 'npm' ? 'npm run dev' : `${pm} run dev`;
  const testCommand = pm === 'npm' ? 'npm test' : `${pm} test`;
  const lintCommand = pm === 'npm' ? 'npm run lint' : `${pm} run lint`;

  return {
    appName: options.appName,
    nodeVersion: options.nodeVersion ?? '22',
    packageManager: pm,
    port: options.port ?? 3000,
    installCommand,
    devCommand,
    testCommand,
    lintCommand,
    useDockerCompose: options.useDockerCompose ?? false,
  };
}

/**
 * Generates DevContainer, VS Code, and Cursor IDE configuration via EJS templates.
 */
export class IdeManager {
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

  async setupDevcontainer(options: IdeSetupOptions): Promise<IdeSetupResult> {
    return this.setup({
      ...options,
      includeDevcontainer: true,
      includeVscode: false,
      includeCursor: false,
    });
  }

  async setupIde(options: IdeSetupOptions): Promise<IdeSetupResult> {
    return this.setup({
      ...options,
      includeDevcontainer: options.includeDevcontainer ?? false,
      includeVscode: true,
      includeCursor: true,
    });
  }

  async setup(options: IdeSetupOptions): Promise<IdeSetupResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const data = buildIdeData(options);
    const written: string[] = [];

    const files: Array<{ template: string; out: string; when?: boolean }> = [
      {
        template: 'features/ide/devcontainer.json.ejs',
        out: '.devcontainer/devcontainer.json',
        when: options.includeDevcontainer,
      },
      {
        template: 'features/ide/docker-compose.devcontainer.yml.ejs',
        out: '.devcontainer/docker-compose.yml',
        when: options.includeDevcontainer && options.useDockerCompose,
      },
      {
        template: 'features/ide/vscode-settings.json.ejs',
        out: '.vscode/settings.json',
        when: options.includeVscode,
      },
      {
        template: 'features/ide/vscode-extensions.json.ejs',
        out: '.vscode/extensions.json',
        when: options.includeVscode,
      },
      {
        template: 'features/ide/vscode-launch.json.ejs',
        out: '.vscode/launch.json',
        when: options.includeVscode,
      },
      {
        template: 'features/ide/cursor-rules.mdc.ejs',
        out: '.cursor/rules/mycli-project.mdc',
        when: options.includeCursor,
      },
      { template: 'features/ide/IDE.md.ejs', out: 'IDE.md' },
    ];

    for (const file of files) {
      if (file.when === false) continue;
      const content = await this.templates.renderFile(file.template, { data });
      if (!options.dryRun) {
        await fs.write(file.out, content);
      }
      written.push(file.out);
    }

    return { files: written };
  }
}

export function createIdeManager(options?: {
  cwd?: string;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
}): IdeManager {
  return new IdeManager(options);
}

export type { IdeSetupOptions, IdeSetupResult, PackageManager } from './types.js';
