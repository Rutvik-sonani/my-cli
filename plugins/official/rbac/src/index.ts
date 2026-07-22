import { createFileSystem } from '@mycli-cli/filesystem';
import { definePlugin } from '@mycli-cli/plugin-system';
import { createRbacManager } from '@mycli-cli/rbac-manager';
import { resolveFeatureTemplatesRoot } from '@mycli-cli/template-engine';

export default definePlugin({
  name: '@mycli-cli/rbac',
  version: '1.0.0',
  description: 'RBAC module generator',
  async install(ctx) {
    const fs = createFileSystem(ctx.app.cwd);
    const rbac = createRbacManager({
      cwd: ctx.app.cwd,
      filesystem: fs,
      templatesRoot: resolveFeatureTemplatesRoot(),
    });
    await rbac.setup({
      orm: (ctx.config.get().orm as 'prisma' | 'drizzle' | undefined) ?? 'prisma',
      language: ctx.config.get().language ?? 'typescript',
    });
    ctx.config.enableFeature('rbac');
    await ctx.config.save();
  },
  commands() {
    return [
      {
        name: 'rbac',
        description: 'RBAC helpers (provided by @mycli-cli/rbac)',
        async handler(commandCtx) {
          commandCtx.app.logger.info('Use `my add rbac` or `my role` / `my permission` commands');
        },
      },
    ];
  },
  dependencies() {
    return {};
  },
});
