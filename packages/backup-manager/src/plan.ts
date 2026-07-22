import { join } from 'node:path';
import type {
  BackupDatabase,
  BackupPlanOptions,
  BackupPlanResult,
  BackupRunOptions,
  BackupRunResult,
} from './types.js';

function timestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function extensionFor(database: BackupDatabase): string {
  switch (database) {
    case 'mongodb':
      return 'archive';
    case 'sqlite':
      return 'db';
    default:
      return 'sql';
  }
}

function sqlitePathFromUrl(url: string): string {
  if (url.startsWith('file:')) {
    return url.replace(/^file:/, '');
  }
  return url;
}

export function planBackup(options: BackupPlanOptions): BackupPlanResult {
  const databaseUrl = options.databaseUrl ?? process.env.DATABASE_URL ?? '';
  const outputDir = options.outputDir ?? 'backups';
  const outputFile = join(
    outputDir,
    `${options.database}-${timestamp()}.${extensionFor(options.database)}`,
  );
  const commands = buildCommands(options.database, databaseUrl, outputFile);
  return { database: options.database, outputFile, commands };
}

function buildCommands(
  database: BackupDatabase,
  databaseUrl: string,
  outputFile: string,
): string[] {
  switch (database) {
    case 'postgresql':
    case 'cockroachdb':
      return [`pg_dump "${databaseUrl}" > "${outputFile}"`];
    case 'mysql':
    case 'mariadb':
      return [`mysqldump --single-transaction "${databaseUrl}" > "${outputFile}"`];
    case 'mongodb':
      return [`mongodump --uri="${databaseUrl}" --archive="${outputFile}" --gzip`];
    case 'sqlite': {
      const path = sqlitePathFromUrl(databaseUrl || './dev.db');
      return [`cp "${path}" "${outputFile}"`];
    }
    case 'sqlserver':
      return [
        `sqlcmd -S localhost -d master -Q "BACKUP DATABASE [app] TO DISK = N'${outputFile}'"`,
      ];
    default:
      return [];
  }
}

export type BackupExecutor = (command: string, cwd: string) => Promise<void>;

const defaultExecutor: BackupExecutor = async (command, cwd) => {
  const { execa } = await import('execa');
  await execa(command, { cwd, shell: true });
};

export async function runBackup(
  options: BackupRunOptions,
  executor: BackupExecutor = defaultExecutor,
): Promise<BackupRunResult> {
  const cwd = options.cwd ?? process.cwd();
  const plan = planBackup(options);
  const commands = plan.commands;

  if (options.dryRun) {
    return { outputFile: plan.outputFile, commands, executed: false };
  }

  const { mkdir } = await import('node:fs/promises');
  const { dirname } = await import('node:path');
  await mkdir(dirname(join(cwd, plan.outputFile)), { recursive: true });

  for (const command of commands) {
    await executor(command, cwd);
  }

  return { outputFile: plan.outputFile, commands, executed: true };
}
