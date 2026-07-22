export {
  ALL_UPGRADE_SCOPES,
  BACKUP_ROOT,
  DEFAULT_BACKUP_TARGETS,
  MIGRATIONS_DIR,
  UPGRADE_REPORT_FILE,
  getMigrationEnvLines,
  parseUpgradeScopes,
  resolveMigrationPaths,
  type MigrationPathConfig,
  type MigrationPaths,
} from './config.js';
export {
  MigrationManager,
  createMigrationManager,
  type MigrationRunCliOptions,
  type MigrationSetupOptions,
  type MigrationSetupResult,
} from './manager.js';
export {
  UpgradeBackupService,
  createUpgradeBackupService,
} from './runtime/backup-service.js';
export {
  MigrationFileService,
  createMigrationFileService,
} from './runtime/migration-file-service.js';
export {
  UpgradeReportService,
  createUpgradeReportService,
} from './runtime/report-service.js';
export {
  UpgradeService,
  createUpgradeService,
  type UpgradeServiceOptions,
} from './runtime/upgrade-service.js';
export type {
  MigrationFile,
  UpgradeAction,
  UpgradeActionStatus,
  UpgradeBackupManifest,
  UpgradeEngineOptions,
  UpgradeReport,
  UpgradeReportSummary,
  UpgradeScope,
} from '@mycli/enterprise-core';
