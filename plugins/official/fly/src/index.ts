import { createCloudManager } from '@mycli-cli/cloud-manager';
import { createDeploymentManager } from '@mycli-cli/deployment-manager';
import { createFileSystem } from '@mycli-cli/filesystem';
import { definePlugin } from '@mycli-cli/plugin-system';
import { resolveFeatureTemplatesRoot } from '@mycli-cli/template-engine';

export default definePlugin({
  name: '@mycli-cli/fly',
  version: '1.0.0',
  description: 'Fly.io cloud deployment',
  async install(ctx) {
    const fs = createFileSystem(ctx.app.cwd);
    const templatesRoot = resolveFeatureTemplatesRoot();
    const appName = ctx.config.get().projectName ?? 'app';
    const deploy = createDeploymentManager({ cwd: ctx.app.cwd, filesystem: fs, templatesRoot });
    await deploy.setup({ provider: 'fly', appName });
    const cloud = createCloudManager({ cwd: ctx.app.cwd, filesystem: fs, templatesRoot });
    await cloud.setupDocs({ provider: 'fly', appName });
    ctx.config.enableFeature('deploy');
    ctx.config.set('deployProvider', 'fly');
    await ctx.config.save();
  },
  commands() {
    return [
      {
        name: 'fly',
        description: 'Fly.io deployment (provided by @mycli-cli/fly)',
        async handler(commandCtx) {
          commandCtx.app.logger.info('Use `my deploy setup --provider fly` or `my deploy push`');
        },
      },
    ];
  },
});
