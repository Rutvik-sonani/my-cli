import type { CliEngine } from '@mycli/cli-engine';
import { defineCommand } from '@mycli/command-engine';
import { createConfigManager } from '@mycli/config-manager';
import { createFileSystem } from '@mycli/filesystem';
import { createOrganizationManager } from '@mycli/organization-engine';
import { resolveTemplatesRoot } from '../paths.js';

export function organizationCommand(engine: CliEngine) {
  return defineCommand({
    name: 'organization',
    description: 'Enterprise organization management — companies, teams, members, projects, roles',
    arguments: [{ name: 'action', description: 'setup', required: false }],
    options: [
      { flags: '--dry-run', description: 'Preview without writing files', defaultValue: false },
    ],
    examples: ['my organization setup', 'my organization setup --dry-run'],
    async handler(ctx) {
      const t = (key: string, params?: Record<string, string>) => engine.i18n.t(key, params);
      const action = (ctx.args.action as string | undefined) ?? 'setup';
      const dryRun = Boolean(ctx.options.dryRun);
      const cwd = engine.app.cwd;

      if (action !== 'setup') {
        throw new Error(`Unknown organization action: ${action}. Use: setup`);
      }

      const config = createConfigManager({ cwd });
      await config.load();
      const fs = createFileSystem(cwd);
      const templatesRoot = resolveTemplatesRoot();
      const projectName = config.get().projectName ?? 'app';
      const language = config.get().generators?.language ?? config.get().language ?? 'typescript';
      const pathConfig = config.get().paths as { organizations?: string };

      const organization = createOrganizationManager({ cwd, filesystem: fs, templatesRoot });
      const result = await organization.setup({
        appName: projectName,
        paths: pathConfig,
        language: language === 'javascript' ? 'javascript' : 'typescript',
        dryRun,
      });

      config.enableFeature('organization');
      if (!dryRun) {
        config.set('paths', {
          ...config.get().paths,
          organizations: pathConfig.organizations ?? 'src/organizations',
        });
        await config.save();
      }

      engine.prompts.success(
        t('organization_setup_done', {
          count: String(result.files.length),
        }),
      );
    },
  });
}
