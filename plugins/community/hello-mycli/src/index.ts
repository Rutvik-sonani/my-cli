import { createFileSystem } from '@mycli/filesystem';
import { definePlugin } from '@mycli/plugin-system';

export default definePlugin({
  name: '@community/hello-mycli',
  version: '1.0.0',
  description: 'Example community plugin — writes a greeting file and adds a hello command',
  async install(ctx) {
    const fs = createFileSystem(ctx.app.cwd);
    await fs.write(
      'HELLO_MYCLI.txt',
      `Hello from @community/hello-mycli!\nProject: ${ctx.config.get().projectName ?? 'app'}\n`,
    );
    ctx.config.enableFeature('hello-mycli');
    await ctx.config.save();
  },
  commands() {
    return [
      {
        name: 'hello',
        description: 'Print a greeting (community plugin example)',
        async handler(commandCtx) {
          commandCtx.app.logger.info('Hello from @community/hello-mycli community plugin!');
        },
      },
    ];
  },
});
