import { createFileSystem } from '@mycli/filesystem';
import { createKubernetesManager } from '@mycli/kubernetes-manager';
import { definePlugin } from '@mycli/plugin-system';
import { resolveFeatureTemplatesRoot } from '@mycli/template-engine';

export default definePlugin({
  name: '@mycli/kubernetes',
  version: '1.0.0',
  description: 'Kubernetes manifests and Helm charts',
  async install(ctx) {
    const fs = createFileSystem(ctx.app.cwd);
    const k8s = createKubernetesManager({
      cwd: ctx.app.cwd,
      filesystem: fs,
      templatesRoot: resolveFeatureTemplatesRoot(),
    });
    const appName = ctx.config.get().projectName ?? 'app';
    await k8s.setup({ appName });
    await k8s.setupHelm({ appName });
    ctx.config.enableFeature('kubernetes');
    ctx.config.enableFeature('helm');
    await ctx.config.save();
  },
  commands() {
    return [
      {
        name: 'kubernetes',
        description: 'Kubernetes helpers (provided by @mycli/kubernetes)',
        async handler(commandCtx) {
          commandCtx.app.logger.info('Use `my add kubernetes` or `my add helm`');
        },
      },
    ];
  },
});
