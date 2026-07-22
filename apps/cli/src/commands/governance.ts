import type { CliEngine } from '@mycli-cli/cli-engine';
import { defineCommand } from '@mycli-cli/command-engine';
import { createConfigManager } from '@mycli-cli/config-manager';
import { createFileSystem } from '@mycli-cli/filesystem';
import { createGovernanceManager } from '@mycli-cli/governance-engine';
import { resolveTemplatesRoot } from '../paths.js';

export function governanceCommand(engine: CliEngine) {
  return defineCommand({
    name: 'governance',
    description: 'Company governance — policy setup and compliance checks',
    arguments: [{ name: 'action', description: 'setup | check', required: false }],
    options: [
      { flags: '--dry-run', description: 'Preview without writing files', defaultValue: false },
      { flags: '--company <name>', description: 'Company name for the policy' },
      { flags: '--output <file>', description: 'Governance report output path' },
    ],
    examples: [
      'my governance setup',
      'my governance setup --company Acme',
      'my governance check',
      'my governance check --dry-run',
    ],
    async handler(ctx) {
      const t = (key: string, params?: Record<string, string>) => engine.i18n.t(key, params);
      const action = (ctx.args.action as string | undefined) ?? 'setup';
      const dryRun = Boolean(ctx.options.dryRun);
      const cwd = engine.app.cwd;

      const config = createConfigManager({ cwd });
      await config.load();
      const fs = createFileSystem(cwd);
      const templatesRoot = resolveTemplatesRoot();
      const projectName = config.get().projectName ?? 'app';
      const language = config.get().generators?.language ?? config.get().language ?? 'typescript';
      const pathConfig = config.get().paths as { governance?: string };
      const company = (ctx.options.company as string | undefined) ?? projectName;

      const governance = createGovernanceManager({ cwd, filesystem: fs, templatesRoot });

      if (action === 'setup') {
        const result = await governance.setup({
          appName: projectName,
          company,
          paths: pathConfig,
          language: language === 'javascript' ? 'javascript' : 'typescript',
          dryRun,
        });

        config.enableFeature('governance');
        if (!dryRun) {
          config.set('paths', {
            ...config.get().paths,
            governance: pathConfig.governance ?? 'src/governance',
          });
          await config.save();
        }

        engine.prompts.success(
          t('governance_setup_done', {
            count: String(result.files.length),
          }),
        );
        return;
      }

      if (action === 'check') {
        const result = await governance.check({
          cwd,
          projectName,
          company,
          outputFile: (ctx.options.output as string | undefined) ?? 'GOVERNANCE_REPORT.md',
          dryRun,
        });

        if (dryRun) {
          engine.prompts.info(
            t('governance_check_dry_run', {
              file: result.reportPath,
              fail: String(result.failCount),
              compliant: result.compliant ? 'yes' : 'no',
            }),
          );
        } else {
          engine.prompts.success(
            t('governance_check_done', {
              file: result.reportPath,
              fail: String(result.failCount),
              compliant: result.compliant ? 'yes' : 'no',
            }),
          );
        }

        if (!result.compliant) {
          throw new Error(
            `Governance check failed (${result.failCount} required rule(s) failed). See ${result.reportPath}`,
          );
        }
        return;
      }

      throw new Error(`Unknown governance action: ${action}. Use: setup | check`);
    },
  });
}
