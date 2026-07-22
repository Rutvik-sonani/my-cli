/**
 * Migration / upgrade engine contracts (Phase 17).
 */
export type UpgradeScope = 'cli' | 'plugin' | 'template' | 'project';

export type UpgradeActionStatus = 'applied' | 'skipped' | 'planned' | 'failed';

export interface UpgradeAction {
  id: string;
  scope: UpgradeScope;
  description: string;
  status: UpgradeActionStatus;
  created?: string[];
  skipped?: string[];
  reason?: string;
}

export interface UpgradeBackupManifest {
  id: string;
  createdAt: string;
  path: string;
  files: string[];
}

export interface UpgradeReportSummary {
  applied: number;
  skipped: number;
  planned: number;
  failed: number;
}

export interface UpgradeReport {
  id: string;
  generatedAt: Date;
  projectName: string;
  fromVersion: string;
  toVersion: string;
  scopes: UpgradeScope[];
  dryRun: boolean;
  backup?: UpgradeBackupManifest;
  actions: UpgradeAction[];
  summary: UpgradeReportSummary;
}

export interface MigrationFile {
  id: string;
  version: string;
  title: string;
  path: string;
  createdAt: string;
}

export interface UpgradeEngineOptions {
  dryRun?: boolean;
  force?: boolean;
  scopes?: UpgradeScope[];
  targetVersion?: string;
  skipBackup?: boolean;
}
