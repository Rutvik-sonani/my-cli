import { createAiManager } from '@mycli/ai-manager';
import { createFileSystem } from '@mycli/filesystem';
import { definePlugin } from '@mycli/plugin-system';
import { resolveFeatureTemplatesRoot } from '@mycli/template-engine';

export default definePlugin({
  name: '@mycli/ai',
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
        description: 'AI helpers (provided by @mycli/ai)',
        async handler(commandCtx) {
          commandCtx.app.logger.info('Use `my ai generate <target> <name>` or `my add ai`');
        },
      },
    ];
  },
});
