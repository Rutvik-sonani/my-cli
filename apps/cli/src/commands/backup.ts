import { createBackupManager } from '@mycli-cli/backup-manager';
import type { BackupDatabase } from '@mycli-cli/backup-manager';
import type { CliEngine } from '@mycli-cli/cli-engine';
import { defineCommand } from '@mycli-cli/command-engine';
import { createConfigManager } from '@mycli-cli/config-manager';
import { createFileSystem } from '@mycli-cli/filesystem';
import { resolveTemplatesRoot } from '../paths.js';

const SUPPORTED_DATABASES: BackupDatabase[] = [
  'postgresql',
  'mysql',
  'mariadb',
  'mongodb',
  'sqlite',
  'cockroachdb',
  'sqlserver',
];

function resolveDatabase(configDb: string | undefined): BackupDatabase {
  if (configDb && SUPPORTED_DATABASES.includes(configDb as BackupDatabase)) {
    return configDb as BackupDatabase;
  }
  return 'postgresql';
}

export function backupCommand(engine: CliEngine) {
  return defineCommand({
    name: 'backup',
    description: 'Database backup — create and list backups',
    arguments: [{ name: 'action', description: 'run | list', required: false }],
    options: [
      { flags: '--output <dir>', description: 'Backup output directory', defaultValue: 'backups' },
      { flags: '--database <engine>', description: 'Database engine override' },
      { flags: '--dry-run', description: 'Preview backup commands', defaultValue: false },
    ],
    examples: ['my backup run', 'my backup run --dry-run', 'my backup list'],
    async handler(ctx) {
      const t = (key: string, params?: Record<string, string>) => engine.i18n.t(key, params);
      const action = (ctx.args.action as string | undefined) ?? 'run';
      const cwd = engine.app.cwd;
      const config = createConfigManager({ cwd });
      await config.load();
      const projectName = config.get().projectName ?? 'app';
      const database = resolveDatabase(
        (ctx.options.database as string | undefined) ?? config.get().database,
      );
      const outputDir = (ctx.options.output as string | undefined) ?? 'backups';
      const dryRun = Boolean(ctx.options.dryRun);
      const fs = createFileSystem(cwd);
      const templatesRoot = resolveTemplatesRoot();
      const backup = createBackupManager({ cwd, filesystem: fs, templatesRoot });

      if (action === 'list') {
        const result = await backup.list({ outputDir });
        if (result.backups.length === 0) {
          engine.prompts.info(t('backup_no_backups', { dir: outputDir }));
          return;
        }
        for (const entry of result.backups) {
          const kb = Math.round(entry.sizeBytes / 1024);
          console.log(`${entry.file}  (${kb} KB, ${entry.createdAt.toISOString()})`);
        }
        return;
      }

      if (action !== 'run') {
        throw new Error(`Unknown backup action: ${action}. Use: run, list`);
      }

      const result = await backup.run({
        database,
        outputDir,
        dryRun,
      });

      if (!dryRun) {
        await backup.writeDocs({ appName: projectName, database, dryRun: false });
      }

      if (dryRun) {
        engine.prompts.info(t('backup_plan_dry_run'));
        for (const command of result.commands) {
          console.log(`  $ ${command}`);
        }
        engine.prompts.success(t('backup_would_write', { file: result.outputFile }));
      } else {
        engine.prompts.success(t('backup_created', { file: result.outputFile }));
      }
    },
  });
}
