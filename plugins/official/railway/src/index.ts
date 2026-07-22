import { createCloudManager } from '@mycli/cloud-manager';
import { createDeploymentManager } from '@mycli/deployment-manager';
import { createFileSystem } from '@mycli/filesystem';
import { definePlugin } from '@mycli/plugin-system';
import { resolveFeatureTemplatesRoot } from '@mycli/template-engine';

export default definePlugin({
  name: '@mycli/railway',
  version: '1.0.0',
  description: 'Railway cloud deployment',
  async install(ctx) {
    const fs = createFileSystem(ctx.app.cwd);
    const templatesRoot = resolveFeatureTemplatesRoot();
    const appName = ctx.config.get().projectName ?? 'app';
    const deploy = createDeploymentManager({ cwd: ctx.app.cwd, filesystem: fs, templatesRoot });
    await deploy.setup({ provider: 'railway', appName });
    const cloud = createCloudManager({ cwd: ctx.app.cwd, filesystem: fs, templatesRoot });
    await cloud.setupDocs({ provider: 'railway', appName });
    ctx.config.enableFeature('deploy');
    ctx.config.set('deployProvider', 'railway');
    await ctx.config.save();
  },
  commands() {
    return [
      {
        name: 'railway',
        description: 'Railway deployment (provided by @mycli/railway)',
        async handler(commandCtx) {
          commandCtx.app.logger.info(
            'Use `my deploy setup --provider railway` or `my deploy push`',
          );
        },
      },
    ];
  },
});
