import type { CliEngine } from '@mycli/cli-engine';
import { defineCommand } from '@mycli/command-engine';
import { createConfigManager } from '@mycli/config-manager';
import { createFileSystem } from '@mycli/filesystem';
import { createRbacManager } from '@mycli/rbac-manager';
import { resolveTemplatesRoot } from '../paths.js';

export function rbacCommand(engine: CliEngine) {
  return defineCommand({
    name: 'rbac',
    description: 'RBAC utilities — sync CLI store to database',
    arguments: [{ name: 'action', description: 'sync', required: false }],
    options: [
      { flags: '--dry-run', description: 'Preview sync command only', defaultValue: false },
    ],
    examples: ['my rbac sync', 'my rbac sync --dry-run'],
    async handler(ctx) {
      const t = (key: string, params?: Record<string, string>) => engine.i18n.t(key, params);
      const action = (ctx.args.action as string | undefined) ?? 'sync';
      if (action !== 'sync') {
        throw new Error(`Unknown rbac action: ${action}`);
      }

      const dryRun = Boolean(ctx.options.dryRun);
      const fs = createFileSystem(engine.app.cwd);
      const config = createConfigManager({ cwd: engine.app.cwd });
      await config.load();

      const rbac = createRbacManager({
        cwd: engine.app.cwd,
        filesystem: fs,
        templatesRoot: resolveTemplatesRoot(),
      });

      if ((config.get().orm ?? 'prisma') !== 'prisma') {
        engine.prompts.warn(t('rbac_prisma_required'));
        return;
      }

      const commands = await rbac.syncToDatabase({ dryRun });
      for (const command of commands) {
        engine.prompts.info(dryRun ? `[dry-run] ${command}` : command);
      }
      engine.prompts.success(dryRun ? t('rbac_sync_planned') : t('rbac_sync_done'));
    },
  });
}
