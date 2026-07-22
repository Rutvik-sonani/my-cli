import { createFileSystem } from '@mycli-cli/filesystem';
import { createGithubManager } from '@mycli-cli/github-manager';
import { definePlugin } from '@mycli-cli/plugin-system';
import { resolveFeatureTemplatesRoot } from '@mycli-cli/template-engine';

export default definePlugin({
  name: '@mycli-cli/github',
  version: '1.0.0',
  description: 'GitHub community files and CI workflows',
  async install(ctx) {
    const fs = createFileSystem(ctx.app.cwd);
    const github = createGithubManager({
      cwd: ctx.app.cwd,
      filesystem: fs,
      templatesRoot: resolveFeatureTemplatesRoot(),
    });
    await github.setup({
      appName: ctx.config.get().projectName ?? 'app',
    });
    ctx.config.enableFeature('github');
    await ctx.config.save();
  },
  commands() {
    return [
      {
        name: 'github',
        description: 'GitHub helpers (provided by @mycli-cli/github)',
        async handler(commandCtx) {
          commandCtx.app.logger.info('Use `my add github` to scaffold GitHub integration');
        },
      },
    ];
  },
});
