import { createAiManager } from '@mycli-cli/ai-manager';
import { createFileSystem } from '@mycli-cli/filesystem';
import { definePlugin } from '@mycli-cli/plugin-system';
import { resolveFeatureTemplatesRoot } from '@mycli-cli/template-engine';

export default definePlugin({
  name: '@mycli-cli/ai',
  version: '1.0.0',
  description: 'AI-assisted code generation for MyCLI projects',
  async install(ctx) {
    const ai = createAiManager({
      cwd: ctx.app.cwd,
      filesystem: createFileSystem(ctx.app.cwd),
      templatesRoot: resolveFeatureTemplatesRoot(),
    });
    await ai.setup({
      appName: ctx.config.get().projectName ?? 'app',
      provider: 'openai',
    });
    ctx.config.enableFeature('ai');
    await ctx.config.save();
  },
  commands() {
    return [
      {
        name: 'ai',
        description: 'AI helpers (provided by @mycli-cli/ai)',
        async handler(commandCtx) {
          commandCtx.app.logger.info('Use `my ai generate <target> <name>` or `my add ai`');
        },
      },
    ];
  },
});
