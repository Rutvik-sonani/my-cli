import { type FileSystem, createFileSystem } from '@mycli-cli/filesystem';
import { type TemplateEngine, createTemplateEngine } from '@mycli-cli/template-engine';
import { listBackups } from './list.js';
import { type BackupExecutor, planBackup, runBackup } from './plan.js';
import type {
  BackupDatabase,
  BackupListOptions,
  BackupListResult,
  BackupPlanOptions,
  BackupPlanResult,
  BackupRunOptions,
  BackupRunResult,
} from './types.js';

export class BackupManager {
  private readonly fs: FileSystem;
  private readonly templates: TemplateEngine;
  private readonly executor?: BackupExecutor;

  constructor(
    options: {
      cwd?: string;
      filesystem?: FileSystem;
      templateEngine?: TemplateEngine;
      templatesRoot?: string;
      executor?: BackupExecutor;
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
    this.executor = options.executor;
  }

  plan(options: BackupPlanOptions): BackupPlanResult {
    return planBackup(options);
  }

  async run(options: BackupRunOptions): Promise<BackupRunResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    return runBackup({ ...options, cwd }, this.executor);
  }

  async list(options: BackupListOptions = {}): Promise<BackupListResult> {
    return listBackups({ ...options, cwd: options.cwd ?? this.fs.getRoot() });
  }

  async writeDocs(options: {
    appName: string;
    database: BackupDatabase;
    dryRun?: boolean;
  }): Promise<string> {
    const content = await this.templates.renderFile('features/backup/BACKUP.md.ejs', {
      data: { appName: options.appName, database: options.database },
    });
    const path = 'docs/backup.md';
    if (!options.dryRun) {
      await this.fs.write(path, content);
    }
    return path;
  }
}

export function createBackupManager(options?: {
  cwd?: string;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
  executor?: BackupExecutor;
}): BackupManager {
  return new BackupManager(options);
}

export type {
  BackupDatabase,
  BackupRunOptions,
  BackupRunResult,
  BackupListOptions,
  BackupListResult,
  BackupPlanOptions,
  BackupPlanResult,
} from './types.js';
export { planBackup, runBackup } from './plan.js';
export { listBackups } from './list.js';
