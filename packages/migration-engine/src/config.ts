import { join } from 'node:path';
import type { UpgradeScope } from '@mycli/enterprise-core';

export interface MigrationPathConfig {
  migration?: string;
}

export interface MigrationPaths {
  root: string;
  migrations: string;
  backup: string;
  reports: string;
}

export function resolveMigrationPaths(config: MigrationPathConfig = {}): MigrationPaths {
  const root = config.migration ?? 'src/migration';
  return {
    root,
    migrations: join(root, 'migrations'),
    backup: join(root, 'backup'),
    reports: join(root, 'reports'),
  };
}

export function getMigrationEnvLines(appName: string): string[] {
  return [
    `MIGRATION_APP=${appName}`,
    'MIGRATION_ENABLED=true',
    'UPGRADE_BACKUP_DIR=.mycli/upgrade-backups',
    'UPGRADE_REPORT_PATH=UPGRADE_REPORT.md',
  ];
}

export const ALL_UPGRADE_SCOPES: UpgradeScope[] = ['project', 'cli', 'plugin', 'template'];

export const BACKUP_ROOT = '.mycli/upgrade-backups';
export const MIGRATIONS_DIR = '.mycli/migrations';
export const UPGRADE_REPORT_FILE = 'UPGRADE_REPORT.md';
export const UPGRADE_STATE_FILE = '.mycli/upgrade-state.json';

/** Files/dirs commonly backed up before project upgrades. */
export const DEFAULT_BACKUP_TARGETS = [
  '.myclirc.json',
  'package.json',
  'ENVIRONMENT.md',
  'biome.json',
  '.editorconfig',
  'GOVERNANCE.md',
  'TEMPLATE_MARKETPLACE.md',
];

export function parseUpgradeScopes(raw?: string | string[]): UpgradeScope[] {
  if (!raw) return [...ALL_UPGRADE_SCOPES];
  const parts = (Array.isArray(raw) ? raw : raw.split(',')).map((s) => s.trim().toLowerCase());
  const scopes = parts.filter((s): s is UpgradeScope =>
    ALL_UPGRADE_SCOPES.includes(s as UpgradeScope),
  );
  return scopes.length > 0 ? scopes : [...ALL_UPGRADE_SCOPES];
}
