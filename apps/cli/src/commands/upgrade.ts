import type { CliEngine } from '@mycli/cli-engine';
import { defineCommand } from '@mycli/command-engine';
import { createConfigManager } from '@mycli/config-manager';
import { createFileSystem } from '@mycli/filesystem';
import { createMigrationManager } from '@mycli/migration-engine';
import { resolveTemplatesRoot } from '../paths.js';

export function upgradeCommand(engine: CliEngine) {
  return defineCommand({
    name: 'upgrade',
    description:
      'Enterprise upgrade engine — backup, migrate, and report without overwriting user code',
    arguments: [
      {
        name: 'action',
        description: 'run (default) | setup',
        required: false,
      },
    ],
    options: [
      { flags: '--dry-run', description: 'Show planned changes only', defaultValue: false },
      {
        flags: '--force',
        description: 'Overwrite existing scaffold files when upgrading',
        defaultValue: false,
      },
      {
        flags: '--scope <scopes>',
        description: 'Comma-separated: project,cli,plugin,template',
      },
      {
        flags: '--skip-backup',
        description: 'Skip pre-upgrade backup',
        defaultValue: false,
      },
    ],
    examples: [
      'my upgrade',
      'my upgrade setup',
      'my upgrade --dry-run',
      'my upgrade --scope project,template',
      'my upgrade --force',
    ],
    async handler(ctx) {
      const t = (key: string, params?: Record<string, string>) => engine.i18n.t(key, params);
      const action = (ctx.args.action as string | undefined) ?? 'run';
      const dryRun = Boolean(ctx.options.dryRun);
      const force = Boolean(ctx.options.force);
      const skipBackup = Boolean(ctx.options.skipBackup);
      const scope = ctx.options.scope as string | undefined;
      const cwd = engine.app.cwd;
      const templatesRoot = resolveTemplatesRoot();

      const config = createConfigManager({ cwd });
      await config.load();
      const fs = createFileSystem(cwd);
      const projectName = config.get().projectName ?? 'app';
      const language = config.get().generators?.language ?? config.get().language ?? 'typescript';
      const pathConfig = config.get().paths as { migration?: string };

      const migration = createMigrationManager({
        cwd,
        filesystem: fs,
        templatesRoot,
      });

      if (action === 'setup') {
        const result = await migration.setup({
          appName: projectName,
          paths: pathConfig,
          language: language === 'javascript' ? 'javascript' : 'typescript',
          dryRun,
        });

        config.enableFeature('migration');
        if (!dryRun) {
          config.set('paths', {
            ...config.get().paths,
            migration: pathConfig.migration ?? 'src/migration',
          });
          await config.save();
        }

        engine.prompts.success(t('upgrade_setup_done', { count: String(result.files.length) }));
        return;
      }

      if (action !== 'run' && action !== 'upgrade') {
        throw new Error(`Unknown upgrade action: ${action}. Use: run | setup`);
      }

      engine.prompts.intro(t('upgrade_intro'));

      const { report, reportPath } = await migration.run({
        cwd,
        templatesRoot,
        cliVersion: engine.app.version,
        targetVersion: engine.app.version,
        dryRun,
        force,
        scope,
        skipBackup,
      });

      engine.prompts.note(`${report.fromVersion} → ${report.toVersion}`, 'Config version');
      if (report.backup) {
        engine.prompts.info(
          t('upgrade_backup_done', {
            path: report.backup.path,
            count: String(report.backup.files.length),
          }),
        );
      }

      for (const actionItem of report.actions) {
        const prefix = dryRun ? '[dry-run] ' : '';
        const created = actionItem.created?.length ? ` → ${actionItem.created.join(', ')}` : '';
        const skipped = actionItem.skipped?.length
          ? ` (skipped: ${actionItem.skipped.join(', ')})`
          : '';
        const reason = actionItem.reason ? ` [${actionItem.reason}]` : '';
        engine.prompts.info(
          `${prefix}[${actionItem.scope}] ${actionItem.description} (${actionItem.status})${created}${skipped}${reason}`,
        );
      }

      if (dryRun) {
        engine.prompts.outro(t('upgrade_dry_run'));
      } else {
        engine.prompts.success(
          t('upgrade_report_done', {
            file: reportPath,
            applied: String(report.summary.applied),
            skipped: String(report.summary.skipped),
          }),
        );
        engine.prompts.outro(t('upgrade_complete', { version: report.toVersion }));
      }
    },
  });
}
