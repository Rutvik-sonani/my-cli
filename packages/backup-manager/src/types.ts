export type BackupDatabase =
  | 'postgresql'
  | 'mysql'
  | 'mariadb'
  | 'mongodb'
  | 'sqlite'
  | 'cockroachdb'
  | 'sqlserver';

export interface BackupRunOptions {
  cwd?: string;
  database: BackupDatabase;
  databaseUrl?: string;
  outputDir?: string;
  dryRun?: boolean;
}

export interface BackupRunResult {
  outputFile: string;
  commands: string[];
  executed: boolean;
}

export interface BackupListOptions {
  cwd?: string;
  outputDir?: string;
}

export interface BackupEntry {
  file: string;
  sizeBytes: number;
  createdAt: Date;
}

export interface BackupListResult {
  backups: BackupEntry[];
}

export interface BackupPlanOptions extends BackupRunOptions {}

export interface BackupPlanResult {
  database: BackupDatabase;
  outputFile: string;
  commands: string[];
}
