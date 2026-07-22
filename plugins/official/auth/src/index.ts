import { createAuthManager } from '@mycli/auth-manager';
import { createFileSystem } from '@mycli/filesystem';
import { definePlugin } from '@mycli/plugin-system';
import { resolveFeatureTemplatesRoot } from '@mycli/template-engine';

export default definePlugin({
  name: '@mycli/auth',
  version: '1.0.0',
  description: 'Authentication module generator',
  async install(ctx) {
    const fs = createFileSystem(ctx.app.cwd);
    const auth = createAuthManager({
      cwd: ctx.app.cwd,
      filesystem: fs,
      templatesRoot: resolveFeatureTemplatesRoot(),
    });
    await auth.setup({
      strategies: ['jwt', 'refresh-token'],
      orm: (ctx.config.get().orm as 'prisma' | 'drizzle' | 'none') ?? 'prisma',
      language: ctx.config.get().language ?? 'typescript',
    });
    ctx.config.enableFeature('auth');
    await ctx.config.save();
  },
  commands() {
    return [
      {
        name: 'auth',
        description: 'Authentication helpers (provided by @mycli/auth)',
        async handler(commandCtx) {
          commandCtx.app.logger.info('Use `my add auth` to scaffold authentication');
        },
      },
    ];
  },
  dependencies() {
    return { jose: '^5.9.6' };
  },
});
