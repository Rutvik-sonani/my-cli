import { createDatabaseManager, registerDatabasePlugin } from '@mycli/database-manager';
import { createFileSystem } from '@mycli/filesystem';
import { definePlugin } from '@mycli/plugin-system';
import { createTemplateEngine, resolveFeatureTemplatesRoot } from '@mycli/template-engine';

export default definePlugin({
  name: '@mycli/postgres',
  version: '1.0.0',
  description: 'PostgreSQL database plugin',
  async install(ctx) {
    const fs = createFileSystem(ctx.app.cwd);
    const templatesRoot = resolveFeatureTemplatesRoot();
    const templates = createTemplateEngine({ filesystem: fs, templatesRoot });
    const db = createDatabaseManager({
      cwd: ctx.app.cwd,
      filesystem: fs,
      templatesRoot,
    });
    registerDatabasePlugin(db, 'postgresql', templates);
    await db.setup({
      database: 'postgresql',
      orm: (ctx.config.get().orm as 'prisma' | 'drizzle') ?? 'prisma',
      appName: ctx.config.get().projectName ?? 'app',
      includeRbac: ctx.config.isFeatureEnabled('rbac'),
    });
    ctx.config.set('database', 'postgresql');
    ctx.config.enableFeature('database');
    await ctx.config.save();
  },
  dependencies() {
    return {};
  },
});
