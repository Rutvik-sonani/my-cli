import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { createConfigManager } from '@mycli/config-manager';
import type {
  UpgradeAction,
  UpgradeEngineOptions,
  UpgradeReport,
  UpgradeReportSummary,
  UpgradeScope,
} from '@mycli/enterprise-core';
import { type FileSystem, createFileSystem } from '@mycli/filesystem';
import { createUpgradeManager } from '@mycli/upgrade-manager';
import { ALL_UPGRADE_SCOPES } from '../config.js';
import { createUpgradeBackupService } from './backup-service.js';
import { createMigrationFileService } from './migration-file-service.js';
import { createUpgradeReportService } from './report-service.js';

export interface UpgradeServiceOptions {
  cwd?: string;
  filesystem?: FileSystem;
  templatesRoot?: string;
  cliVersion?: string;
}

function emptySummary(): UpgradeReportSummary {
  return { applied: 0, skipped: 0, planned: 0, failed: 0 };
}

function summarize(actions: UpgradeAction[]): UpgradeReportSummary {
  const summary = emptySummary();
  for (const action of actions) {
    if (action.status === 'applied') summary.applied += 1;
    else if (action.status === 'skipped') summary.skipped += 1;
    else if (action.status === 'planned') summary.planned += 1;
    else summary.failed += 1;
  }
  return summary;
}

/**
 * Orchestrates multi-scope upgrades with backup + report.
 * Never overwrites user changes unless force is set (delegated to upgrade-manager).
 */
export class UpgradeService {
  private readonly fs: FileSystem;
  private readonly templatesRoot?: string;
  private readonly cliVersion: string;

  constructor(options: UpgradeServiceOptions = {}) {
    const cwd = options.cwd ?? process.cwd();
    this.fs = options.filesystem ?? createFileSystem(cwd);
    this.templatesRoot = options.templatesRoot;
    this.cliVersion = options.cliVersion ?? '1.0.0';
  }

  async run(options: UpgradeEngineOptions = {}): Promise<{
    report: UpgradeReport;
    reportPath: string;
  }> {
    const dryRun = Boolean(options.dryRun);
    const force = Boolean(options.force);
    const scopes = options.scopes?.length ? options.scopes : [...ALL_UPGRADE_SCOPES];
    const targetVersion = options.targetVersion ?? this.cliVersion;

    const config = createConfigManager({ cwd: this.fs.getRoot(), filesystem: this.fs });
    await config.load();
    const projectName = config.get().projectName ?? 'app';
    const fromVersion = config.get().version ?? '0.0.0';

    const backupService = createUpgradeBackupService(this.fs);
    const reportService = createUpgradeReportService(this.fs);
    const migrationFiles = createMigrationFileService(this.fs);

    const backup =
      options.skipBackup || !scopes.includes('project')
        ? undefined
        : await backupService.createBackup({ dryRun });

    const actions: UpgradeAction[] = [];

    if (scopes.includes('project')) {
      actions.push(...(await this.runProjectUpgrade({ dryRun, force, targetVersion })));
    }
    if (scopes.includes('cli')) {
      actions.push(...(await this.runCliUpgrade({ dryRun, targetVersion })));
    }
    if (scopes.includes('plugin')) {
      actions.push(...(await this.runPluginUpgrade({ dryRun })));
    }
    if (scopes.includes('template')) {
      actions.push(...(await this.runTemplateUpgrade({ dryRun, force })));
    }

    await migrationFiles.writeMigration({
      id: 'upgrade-run',
      version: targetVersion,
      title: `Upgrade ${fromVersion} → ${targetVersion}`,
      body: actions.map((a) => `- [${a.scope}] ${a.description}: ${a.status}`).join('\n'),
      dryRun,
    });

    const report: UpgradeReport = {
      id: randomUUID(),
      generatedAt: new Date(),
      projectName,
      fromVersion,
      toVersion: targetVersion,
      scopes,
      dryRun,
      backup,
      actions,
      summary: summarize(actions),
    };

    const reportPath = await reportService.write(report, { dryRun });
    return { report, reportPath };
  }

  private async runProjectUpgrade(options: {
    dryRun: boolean;
    force: boolean;
    targetVersion: string;
  }): Promise<UpgradeAction[]> {
    const upgrade = createUpgradeManager({ cwd: this.fs.getRoot() });
    const result = await upgrade.run({
      cwd: this.fs.getRoot(),
      targetVersion: options.targetVersion,
      dryRun: options.dryRun,
      force: options.force,
      templatesRoot: this.templatesRoot,
    });

    return result.migrations.map((migration) => {
      const already = migration.skipped.includes('already-applied');
      let status: UpgradeAction['status'] = 'skipped';
      if (options.dryRun && !already) status = 'planned';
      else if (migration.applied) status = 'applied';
      else if (already || migration.skipped.length > 0) status = 'skipped';

      return {
        id: migration.id,
        scope: 'project' as const,
        description: migration.description,
        status,
        created: migration.created,
        skipped: migration.skipped,
        reason: already ? 'already-applied' : undefined,
      };
    });
  }

  private async runCliUpgrade(options: {
    dryRun: boolean;
    targetVersion: string;
  }): Promise<UpgradeAction[]> {
    let packageCliHint: string | undefined;
    try {
      const pkg = await this.fs.readJson<{
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      }>('package.json');
      packageCliHint = pkg.dependencies?.['@mycli/cli'] ?? pkg.devDependencies?.['@mycli/cli'];
    } catch {
      /* optional */
    }

    const notePath = join('.mycli', 'cli-upgrade-notes.md');
    const content = `# CLI Upgrade Notes

- Current CLI runtime: ${this.cliVersion}
- Target: ${options.targetVersion}
- Declared @mycli/cli: ${packageCliHint ?? 'not declared in package.json'}

Keep the CLI and generated project config versions aligned.
Run \`my upgrade --scope project\` after updating the CLI package.
`;

    if (options.dryRun) {
      return [
        {
          id: 'cli-upgrade-notes',
          scope: 'cli',
          description: 'Plan CLI compatibility notes',
          status: 'planned',
          created: [notePath],
        },
      ];
    }

    await this.fs.write(notePath, content);
    return [
      {
        id: 'cli-upgrade-notes',
        scope: 'cli',
        description: 'Write CLI compatibility notes',
        status: 'applied',
        created: [notePath],
      },
    ];
  }

  private async runPluginUpgrade(options: { dryRun: boolean }): Promise<UpgradeAction[]> {
    const pluginRoots = ['plugins/installed', 'plugins/community', 'plugins'];
    const found: string[] = [];
    for (const root of pluginRoots) {
      if (!(await this.fs.exists(root))) continue;
      try {
        const entries = await this.fs.list(root);
        for (const entry of entries) {
          if (entry.isDirectory) found.push(entry.relativePath);
        }
      } catch {
        /* ignore */
      }
    }

    if (found.length === 0) {
      return [
        {
          id: 'plugin-scan',
          scope: 'plugin',
          description: 'Scan installed plugins for upgrades',
          status: 'skipped',
          reason: 'no plugins found',
        },
      ];
    }

    const reportPath = join('.mycli', 'plugin-upgrade-check.md');
    const body = `# Plugin Upgrade Check

Plugins detected:

${found.map((p) => `- ${p}`).join('\n')}

Compatibility is validated against CLI ${this.cliVersion}.
Use \`my plugin update <name>\` to apply plugin updates.
`;

    if (options.dryRun) {
      return [
        {
          id: 'plugin-scan',
          scope: 'plugin',
          description: `Plan plugin upgrade check (${found.length} plugin dirs)`,
          status: 'planned',
          created: [reportPath],
        },
      ];
    }

    await this.fs.write(reportPath, body);
    return [
      {
        id: 'plugin-scan',
        scope: 'plugin',
        description: `Plugin upgrade check (${found.length} plugin dirs)`,
        status: 'applied',
        created: [reportPath],
      },
    ];
  }

  private async runTemplateUpgrade(options: {
    dryRun: boolean;
    force: boolean;
  }): Promise<UpgradeAction[]> {
    const installedManifest = 'templates/installed/installed.json';
    if (!(await this.fs.exists(installedManifest))) {
      return [
        {
          id: 'template-upgrade',
          scope: 'template',
          description: 'Upgrade installed marketplace templates',
          status: 'skipped',
          reason: 'no installed templates',
        },
      ];
    }

    const data = await this.fs.readJson<{
      installed?: Array<{ name: string; version: string; path: string }>;
    }>(installedManifest);
    const installed = data.installed ?? [];
    if (installed.length === 0) {
      return [
        {
          id: 'template-upgrade',
          scope: 'template',
          description: 'Upgrade installed marketplace templates',
          status: 'skipped',
          reason: 'empty install manifest',
        },
      ];
    }

    const actions: UpgradeAction[] = [];
    for (const item of installed) {
      const marker = join(item.path, '.upgrade-stamp');
      const exists = await this.fs.exists(marker);
      if (exists && !options.force) {
        actions.push({
          id: `template-${item.name}`,
          scope: 'template',
          description: `Template ${item.name}@${item.version}`,
          status: 'skipped',
          skipped: [marker],
          reason: 'already stamped (use --force to refresh)',
        });
        continue;
      }

      if (options.dryRun) {
        actions.push({
          id: `template-${item.name}`,
          scope: 'template',
          description: `Template ${item.name}@${item.version}`,
          status: 'planned',
          created: [marker],
        });
        continue;
      }

      await this.fs.write(
        marker,
        `# Upgraded\n\n- Template: ${item.name}\n- Version: ${item.version}\n- At: ${new Date().toISOString()}\n`,
      );
      actions.push({
        id: `template-${item.name}`,
        scope: 'template',
        description: `Template ${item.name}@${item.version}`,
        status: 'applied',
        created: [marker],
      });
    }

    return actions;
  }
}

export function createUpgradeService(options?: UpgradeServiceOptions): UpgradeService {
  return new UpgradeService(options);
}

export type { UpgradeScope };
