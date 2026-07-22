import { type FileSystem, createFileSystem } from '@mycli-cli/filesystem';
import { type TemplateEngine, createTemplateEngine } from '@mycli-cli/template-engine';
import {
  type SyncExecutor,
  defaultSyncExecutor,
  executeProviderSync,
  providerSyncCommands,
} from './sync-providers.js';
import type {
  SecretEntry,
  SecretsPlanResult,
  SecretsSetupOptions,
  SecretsSetupResult,
  SecretsSyncOptions,
  SecretsSyncResult,
} from './types.js';

const SKIP_KEYS = new Set(['NODE_ENV', 'PORT']);

function parseEnv(content: string): SecretEntry[] {
  const entries: SecretEntry[] = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    entries.push({ key, value });
  }
  return entries;
}

/**
 * Environment secrets planning and sync to cloud providers.
 */
export class SecretsManager {
  private readonly fs: FileSystem;
  private readonly templates: TemplateEngine;
  private readonly exec: SyncExecutor;

  constructor(
    options: {
      cwd?: string;
      filesystem?: FileSystem;
      templateEngine?: TemplateEngine;
      templatesRoot?: string;
      executor?: SyncExecutor;
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
    this.exec = options.executor ?? defaultSyncExecutor;
  }

  async loadEnv(envFile: string, cwd?: string): Promise<SecretEntry[]> {
    const fs = createFileSystem(cwd ?? this.fs.getRoot());
    if (!(await fs.exists(envFile))) {
      return [];
    }
    const content = await fs.read(envFile);
    return parseEnv(content);
  }

  async planSync(options: SecretsSyncOptions): Promise<SecretsPlanResult> {
    const envFile = options.envFile ?? '.env';
    const all = await this.loadEnv(envFile, options.cwd);
    const toSync = all.filter((e) => !SKIP_KEYS.has(e.key));
    const skipped = all.filter((e) => SKIP_KEYS.has(e.key)).map((e) => e.key);
    const commands = providerSyncCommands(options.provider, toSync, options.appName);
    return { provider: options.provider, toSync, skipped, commands };
  }

  async sync(options: SecretsSyncOptions): Promise<SecretsSyncResult> {
    const plan = await this.planSync(options);
    const cwd = options.cwd ?? this.fs.getRoot();

    if (options.dryRun) {
      return {
        provider: options.provider,
        synced: plan.toSync,
        skipped: plan.skipped,
        commands: plan.commands,
        message: `Plan sync ${plan.toSync.length} secrets to ${options.provider}`,
      };
    }

    const { commands, failures } = await executeProviderSync(
      options.provider,
      plan.toSync,
      options.appName,
      cwd,
      this.exec,
    );

    if (failures.length > 0) {
      return {
        provider: options.provider,
        synced: plan.toSync.filter((e) => !failures.some((f) => f.startsWith(`${e.key}:`))),
        skipped: plan.skipped,
        commands,
        message: `Synced with ${failures.length} failure(s): ${failures.join('; ')}`,
      };
    }

    return {
      provider: options.provider,
      synced: plan.toSync,
      skipped: plan.skipped,
      commands,
      message: `Synced ${plan.toSync.length} secrets to ${options.provider}`,
    };
  }

  async setupDocs(options: SecretsSetupOptions): Promise<SecretsSetupResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const data = {
      appName: options.appName,
      provider: options.provider,
      environment: options.environment ?? 'production',
    };
    const out = `deploy/secrets.${options.provider}.md`;
    const content = await this.templates.renderFile('features/cloud/secrets.md.ejs', { data });
    if (!options.dryRun) {
      await fs.write(out, content);
    }
    return { files: [out] };
  }
}

export function createSecretsManager(options?: {
  cwd?: string;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
  executor?: SyncExecutor;
}): SecretsManager {
  return new SecretsManager(options);
}

export type {
  SecretsProvider,
  SecretEntry,
  SecretsSyncOptions,
  SecretsSyncResult,
  SecretsPlanResult,
  SecretsSetupOptions,
  SecretsSetupResult,
} from './types.js';

export {
  defaultSyncExecutor,
  executeProviderSync,
  providerSyncCommands,
} from './sync-providers.js';
export type { SyncExecutor } from './sync-providers.js';
