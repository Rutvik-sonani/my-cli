import { createApiManager } from '@mycli-cli/api-manager';
import { createFileSystem } from '@mycli-cli/filesystem';
import { definePlugin } from '@mycli-cli/plugin-system';
import { resolveFeatureTemplatesRoot } from '@mycli-cli/template-engine';

export default definePlugin({
  name: '@mycli-cli/swagger',
  version: '1.0.0',
  description: 'Swagger / OpenAPI documentation',
  async install(ctx) {
    const fs = createFileSystem(ctx.app.cwd);
    const api = createApiManager({
      cwd: ctx.app.cwd,
      filesystem: fs,
      templatesRoot: resolveFeatureTemplatesRoot(),
    });
    await api.generateDocs({
      provider: 'swagger',
      title: ctx.config.get().projectName ?? 'API',
    });
    await api.generateClients({
      postman: true,
      bruno: true,
      title: ctx.config.get().projectName ?? 'API',
    });
    ctx.config.enableFeature('api-docs');
    await ctx.config.save();
  },
  dependencies() {
    return {
      '@fastify/swagger': '^9.4.2',
      '@fastify/swagger-ui': '^5.2.1',
    };
  },
});
