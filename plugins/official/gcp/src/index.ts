import { createDeploymentManager } from '@mycli/deployment-manager';
import { createFileSystem } from '@mycli/filesystem';
import { definePlugin } from '@mycli/plugin-system';
import { resolveFeatureTemplatesRoot } from '@mycli/template-engine';

export default definePlugin({
  name: '@mycli/gcp',
  version: '1.0.0',
  description: 'GCP deployment via Terraform (Cloud Run)',
  async install(ctx) {
    const fs = createFileSystem(ctx.app.cwd);
    const deploy = createDeploymentManager({
      cwd: ctx.app.cwd,
      filesystem: fs,
      templatesRoot: resolveFeatureTemplatesRoot(),
    });
    await deploy.setupTerraform({
      provider: 'gcp',
      appName: ctx.config.get().projectName ?? 'app',
      region: 'us-central1',
    });
    ctx.config.enableFeature('terraform');
    ctx.config.set('terraformProvider', 'gcp');
    await ctx.config.save();
  },
  commands() {
    return [
      {
        name: 'gcp',
        description: 'GCP deployment helpers (provided by @mycli/gcp)',
        async handler(commandCtx) {
          commandCtx.app.logger.info(
            'Use `my add terraform --provider gcp` or `my deploy terraform --provider gcp`',
          );
        },
      },
    ];
  },
});
