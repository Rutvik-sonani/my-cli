import { createDockerManager } from '@mycli-cli/docker-manager';
import { createFileSystem } from '@mycli-cli/filesystem';
import { definePlugin } from '@mycli-cli/plugin-system';
import { resolveFeatureTemplatesRoot } from '@mycli-cli/template-engine';

export default definePlugin({
  name: '@mycli-cli/docker',
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
        description: 'Docker helpers (provided by @mycli-cli/docker)',
        async handler(commandCtx) {
          commandCtx.app.logger.info('Use `my add docker` to scaffold container files');
        },
      },
    ];
  },
});
