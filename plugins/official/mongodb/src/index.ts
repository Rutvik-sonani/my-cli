import { createDatabaseManager, registerDatabasePlugin } from '@mycli-cli/database-manager';
import { createFileSystem } from '@mycli-cli/filesystem';
import { definePlugin } from '@mycli-cli/plugin-system';
import { createTemplateEngine, resolveFeatureTemplatesRoot } from '@mycli-cli/template-engine';

export default definePlugin({
  name: '@mycli-cli/mongodb',
  version: '1.0.0',
  description: 'MongoDB database plugin',
  async install(ctx) {
    const fs = createFileSystem(ctx.app.cwd);
    const templatesRoot = resolveFeatureTemplatesRoot();
    const templates = createTemplateEngine({ filesystem: fs, templatesRoot });
    const db = createDatabaseManager({
      cwd: ctx.app.cwd,
      filesystem: fs,
      templatesRoot,
    });
    registerDatabasePlugin(db, 'mongodb', templates);
    await db.setup({
      database: 'mongodb',
      orm: (ctx.config.get().orm as 'mongoose') ?? 'mongoose',
      appName: ctx.config.get().projectName ?? 'app',
      includeRbac: ctx.config.isFeatureEnabled('rbac'),
    });
    ctx.config.set('database', 'mongodb');
    ctx.config.set('orm', 'mongoose');
    ctx.config.enableFeature('database');
    await ctx.config.save();
  },
  dependencies() {
    return { mongoose: '^8.9.3' };
  },
});
