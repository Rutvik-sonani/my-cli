import { createDockerManager } from '@mycli/docker-manager';
import { createFileSystem } from '@mycli/filesystem';
import { definePlugin } from '@mycli/plugin-system';
import { resolveFeatureTemplatesRoot } from '@mycli/template-engine';

export default definePlugin({
  name: '@mycli/docker',
  version: '1.0.0',
  description: 'Docker and Docker Compose generation',
  async install(ctx) {
    const fs = createFileSystem(ctx.app.cwd);
    const docker = createDockerManager({
      cwd: ctx.app.cwd,
      filesystem: fs,
      templatesRoot: resolveFeatureTemplatesRoot(),
    });
    const db = ctx.config.get().database ?? 'postgresql';
    await docker.generate({
      appName: ctx.config.get().projectName ?? 'app',
      database:
        db === 'postgresql'
          ? 'postgres'
          : db === 'mysql' || db === 'mariadb'
            ? 'mysql'
            : db === 'mongodb'
              ? 'mongodb'
              : 'none',
      redis: true,
      mailhog: true,
    });
    ctx.config.enableFeature('docker');
    await ctx.config.save();
  },
  commands() {
    return [
      {
        name: 'docker',
        description: 'Docker helpers (provided by @mycli/docker)',
        async handler(commandCtx) {
          commandCtx.app.logger.info('Use `my add docker` to scaffold container files');
        },
      },
    ];
  },
});
