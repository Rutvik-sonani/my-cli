import { createDatabaseManager } from '@mycli/database-manager';
import { createFileSystem } from '@mycli/filesystem';
import { definePlugin } from '@mycli/plugin-system';
import { resolveFeatureTemplatesRoot } from '@mycli/template-engine';

export default definePlugin({
  name: '@mycli/prisma',
  version: '1.0.0',
  description: 'Prisma ORM integration',
  async install(ctx) {
    const fs = createFileSystem(ctx.app.cwd);
    const db = createDatabaseManager({
      cwd: ctx.app.cwd,
      filesystem: fs,
      templatesRoot: resolveFeatureTemplatesRoot(),
    });
    await db.setup({
      database: (ctx.config.get().database as 'postgresql') ?? 'postgresql',
      orm: 'prisma',
      appName: ctx.config.get().projectName ?? 'app',
      includeRbac: ctx.config.isFeatureEnabled('rbac'),
    });
    ctx.config.set('orm', 'prisma');
    ctx.config.enableFeature('database');
    await ctx.config.save();
  },
  dependencies() {
    return {
      '@prisma/client': '^6.2.1',
      prisma: '^6.2.1',
      tsx: '^4.19.2',
    };
  },
});
