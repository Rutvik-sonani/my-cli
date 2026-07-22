import { createDeploymentManager } from '@mycli-cli/deployment-manager';
import { createFileSystem } from '@mycli-cli/filesystem';
import { definePlugin } from '@mycli-cli/plugin-system';
import { resolveFeatureTemplatesRoot } from '@mycli-cli/template-engine';

export default definePlugin({
  name: '@mycli-cli/azure',
  version: '1.0.0',
  description: 'Azure deployment via Terraform (Container Apps)',
  async install(ctx) {
    const fs = createFileSystem(ctx.app.cwd);
    const deploy = createDeploymentManager({
      cwd: ctx.app.cwd,
      filesystem: fs,
      templatesRoot: resolveFeatureTemplatesRoot(),
    });
    await deploy.setupTerraform({
      provider: 'azure',
      appName: ctx.config.get().projectName ?? 'app',
      region: 'eastus',
    });
    ctx.config.enableFeature('terraform');
    ctx.config.set('terraformProvider', 'azure');
    await ctx.config.save();
  },
  commands() {
    return [
      {
        name: 'azure',
        description: 'Azure deployment helpers (provided by @mycli-cli/azure)',
        async handler(commandCtx) {
          commandCtx.app.logger.info(
            'Use `my add terraform --provider azure` or `my deploy terraform --provider azure`',
          );
        },
      },
    ];
  },
});
