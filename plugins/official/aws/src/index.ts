import { createDeploymentManager } from '@mycli-cli/deployment-manager';
import { createFileSystem } from '@mycli-cli/filesystem';
import { definePlugin } from '@mycli-cli/plugin-system';
import { resolveFeatureTemplatesRoot } from '@mycli-cli/template-engine';

export default definePlugin({
  name: '@mycli-cli/aws',
  version: '1.0.0',
  description: 'AWS deployment via Terraform (ECS Fargate)',
  async install(ctx) {
    const fs = createFileSystem(ctx.app.cwd);
    const deploy = createDeploymentManager({
      cwd: ctx.app.cwd,
      filesystem: fs,
      templatesRoot: resolveFeatureTemplatesRoot(),
    });
    await deploy.setupTerraform({
      provider: 'aws',
      appName: ctx.config.get().projectName ?? 'app',
      region: 'us-east-1',
    });
    ctx.config.enableFeature('terraform');
    ctx.config.set('terraformProvider', 'aws');
    await ctx.config.save();
  },
  commands() {
    return [
      {
        name: 'aws',
        description: 'AWS deployment helpers (provided by @mycli-cli/aws)',
        async handler(commandCtx) {
          commandCtx.app.logger.info(
            'Use `my add terraform --provider aws` or `my deploy terraform --provider aws`',
          );
        },
      },
    ];
  },
});
