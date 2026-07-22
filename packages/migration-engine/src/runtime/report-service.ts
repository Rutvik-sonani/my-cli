import type { UpgradeReport } from '@mycli/enterprise-core';
import type { FileSystem } from '@mycli/filesystem';
import { UPGRADE_REPORT_FILE } from '../config.js';

/**
 * Renders and persists upgrade reports.
 */
export class UpgradeReportService {
  constructor(private readonly fs: FileSystem) {}

  renderMarkdown(report: UpgradeReport): string {
    const lines = [
      `# Upgrade Report — ${report.projectName}`,
      '',
      `- Generated: ${report.generatedAt.toISOString()}`,
      `- Version: ${report.fromVersion} → ${report.toVersion}`,
      `- Scopes: ${report.scopes.join(', ')}`,
      `- Dry run: ${report.dryRun ? 'yes' : 'no'}`,
      `- Applied: ${report.summary.applied}`,
      `- Skipped: ${report.summary.skipped}`,
      `- Planned: ${report.summary.planned}`,
      `- Failed: ${report.summary.failed}`,
      '',
    ];

    if (report.backup) {
      lines.push('## Backup');
      lines.push('');
      lines.push(`- Id: ${report.backup.id}`);
      lines.push(`- Path: ${report.backup.path}`);
      lines.push(
        `- Files: ${report.backup.files.length ? report.backup.files.join(', ') : '(none)'}`,
      );
      lines.push('');
    }

    lines.push('## Actions');
    lines.push('');
    for (const action of report.actions) {
      const mark =
        action.status === 'applied'
          ? '✔'
          : action.status === 'planned'
            ? '○'
            : action.status === 'failed'
              ? '✘'
              : '–';
      lines.push(`- ${mark} **[${action.scope}] ${action.description}** (${action.status})`);
      if (action.created?.length) lines.push(`  - Created: ${action.created.join(', ')}`);
      if (action.skipped?.length) lines.push(`  - Skipped: ${action.skipped.join(', ')}`);
      if (action.reason) lines.push(`  - Reason: ${action.reason}`);
    }
    lines.push('');
    lines.push('> User files are never overwritten unless `--force` is explicitly set.');
    lines.push('');
    return lines.join('\n');
  }

  async write(
    report: UpgradeReport,
    options: { dryRun?: boolean; path?: string } = {},
  ): Promise<string> {
    const path = options.path ?? UPGRADE_REPORT_FILE;
    const markdown = this.renderMarkdown(report);
    if (!options.dryRun) {
      await this.fs.write(path, markdown);
    }
    return path;
  }
}

export function createUpgradeReportService(fs: FileSystem): UpgradeReportService {
  return new UpgradeReportService(fs);
}
