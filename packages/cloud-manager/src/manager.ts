import { type FileSystem, createFileSystem } from '@mycli-cli/filesystem';
import { type TemplateEngine, createTemplateEngine } from '@mycli-cli/template-engine';
import type { CommandExecutor } from './providers/base.js';
import { defaultExecutor, getProviderAdapter } from './providers/index.js';
import {
  destroyProvider,
  fetchProviderLogs,
  fetchProviderStatus,
  rollbackProvider,
} from './providers/operations.js';
import type {
  CloudDeployOptions,
  CloudDeployResult,
  CloudLogsResult,
  CloudProvider,
  CloudSetupDocsOptions,
  CloudSetupDocsResult,
  CloudStatusResult,
  CloudValidateResult,
} from './types.js';

/**
 * Runtime cloud deployment operations via provider CLI adapters.
 */
export class CloudManager {
  private readonly fs: FileSystem;
  private readonly templates: TemplateEngine;
  private readonly exec: CommandExecutor;

  constructor(
    options: {
      cwd?: string;
      filesystem?: FileSystem;
      templateEngine?: TemplateEngine;
      templatesRoot?: string;
      executor?: CommandExecutor;
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
    this.exec = options.executor ?? defaultExecutor;
  }

  async validate(provider: CloudProvider, cwd?: string): Promise<CloudValidateResult> {
    const root = cwd ?? this.fs.getRoot();
    const fs = createFileSystem(root);
    const adapter = getProviderAdapter(provider);
    const missingFiles: string[] = [];
    for (const file of adapter.requiredFiles()) {
      if (!(await fs.exists(file))) missingFiles.push(file);
    }
    const missingEnv = adapter.requiredEnv().filter((key) => !process.env[key]);
    const missingCli: string[] = [];
    for (const cli of adapter.requiredCli()) {
      const result = await this.exec(cli, ['--version'], { cwd: root, dryRun: false });
      if (result.exitCode !== 0) missingCli.push(cli);
    }
    const ready = missingFiles.length === 0;
    return {
      provider,
      ready,
      missingFiles,
      missingEnv,
      missingCli,
      message: ready ? `Ready to deploy to ${provider}` : `Missing requirements for ${provider}`,
    };
  }

  async setupDocs(options: CloudSetupDocsOptions): Promise<CloudSetupDocsResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const data = {
      appName: options.appName,
      provider: options.provider,
      environment: options.environment ?? 'production',
    };
    const written: string[] = [];
    const files = [
      { template: 'features/cloud/DEPLOY.md.ejs', out: 'DEPLOY.md' },
      { template: 'features/cloud/.env.production.example.ejs', out: '.env.production.example' },
      { template: 'features/cloud/secrets.md.ejs', out: `deploy/secrets.${options.provider}.md` },
    ];
    for (const file of files) {
      const content = await this.templates.renderFile(file.template, { data });
      if (!options.dryRun) {
        await fs.write(file.out, content);
      }
      written.push(file.out);
    }
    return { files: written };
  }

  planPush(options: CloudDeployOptions): CloudDeployResult {
    return getProviderAdapter(options.provider).planPush(options);
  }

  async push(options: CloudDeployOptions): Promise<CloudDeployResult> {
    return getProviderAdapter(options.provider).push(options, this.exec);
  }

  async status(options: {
    cwd?: string;
    provider: CloudProvider;
    appName: string;
  }): Promise<CloudStatusResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const result = await fetchProviderStatus(options.provider, options.appName, cwd, this.exec);
    return {
      provider: options.provider,
      status: result.status,
      message: result.message,
    };
  }

  async logs(options: {
    cwd?: string;
    provider: CloudProvider;
    appName: string;
    lines?: number;
  }): Promise<CloudLogsResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    return fetchProviderLogs(
      options.provider,
      options.appName,
      cwd,
      options.lines ?? 50,
      this.exec,
    );
  }

  async rollback(options: CloudDeployOptions): Promise<CloudDeployResult> {
    return rollbackProvider(options, this.exec);
  }

  async destroy(options: CloudDeployOptions): Promise<CloudDeployResult> {
    return destroyProvider(options, this.exec);
  }
}

export function createCloudManager(options?: {
  cwd?: string;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
  executor?: CommandExecutor;
}): CloudManager {
  return new CloudManager(options);
}

export type {
  CloudProvider,
  CloudDeployOptions,
  CloudDeployResult,
  CloudStatusResult,
  CloudLogsResult,
  CloudSetupDocsOptions,
  CloudSetupDocsResult,
  CloudValidateResult,
} from './types.js';
