import { createDatabaseManager, registerDatabasePlugin } from '@mycli-cli/database-manager';
import { createFileSystem } from '@mycli-cli/filesystem';
import { definePlugin } from '@mycli-cli/plugin-system';
import { createTemplateEngine, resolveFeatureTemplatesRoot } from '@mycli-cli/template-engine';

export default definePlugin({
  name: '@mycli-cli/mysql',
  version: '1.0.0',
  description: 'MySQL database plugin',
  async install(ctx) {
    const fs = createFileSystem(ctx.app.cwd);
    const templatesRoot = resolveFeatureTemplatesRoot();
    const templates = createTemplateEngine({ filesystem: fs, templatesRoot });
    const db = createDatabaseManager({
      cwd: ctx.app.cwd,
      filesystem: fs,
      templatesRoot,
    });
    registerDatabasePlugin(db, 'mysql', templates);
    await db.setup({
      database: 'mysql',
      orm: (ctx.config.get().orm as 'prisma') ?? 'prisma',
      appName: ctx.config.get().projectName ?? 'app',
      includeRbac: ctx.config.isFeatureEnabled('rbac'),
    });
    ctx.config.set('database', 'mysql');
    ctx.config.enableFeature('database');
    await ctx.config.save();
  },
  dependencies() {
    return {};
  },
});
