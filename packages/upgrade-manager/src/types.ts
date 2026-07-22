import type { ConfigManager } from '@mycli/config-manager';
import type { FileSystem } from '@mycli/filesystem';
import type { TemplateEngine } from '@mycli/template-engine';

export interface UpgradeContext {
  cwd: string;
  fs: FileSystem;
  config: ConfigManager;
  templates?: TemplateEngine;
  dryRun: boolean;
  force: boolean;
  targetVersion: string;
}

export interface UpgradeMigrationResult {
  id: string;
  description: string;
  applied: boolean;
  created: string[];
  skipped: string[];
}

export interface UpgradeMigration {
  id: string;
  description: string;
  minVersion?: string;
  run(context: UpgradeContext): Promise<UpgradeMigrationResult>;
}

export interface UpgradeRunOptions {
  cwd?: string;
  targetVersion?: string;
  dryRun?: boolean;
  force?: boolean;
  templatesRoot?: string;
}

export interface UpgradeRunResult {
  fromVersion: string;
  toVersion: string;
  migrations: UpgradeMigrationResult[];
}

export interface UpgradeState {
  applied: string[];
  version: string;
}
