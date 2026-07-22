import { createDatabaseManager, registerDatabasePlugin } from '@mycli/database-manager';
import { createFileSystem } from '@mycli/filesystem';
import { definePlugin } from '@mycli/plugin-system';
import { createTemplateEngine, resolveFeatureTemplatesRoot } from '@mycli/template-engine';

export default definePlugin({
  name: '@mycli/mysql',
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
