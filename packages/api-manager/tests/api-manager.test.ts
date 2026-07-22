import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSystem } from '@mycli-cli/filesystem';
import { afterEach, describe, expect, it } from 'vitest';
import { createApiManager } from '../src/index.js';
import { featureTemplatesRoot } from './helpers.js';

describe('ApiManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('generates swagger provider docs and routes', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-api-swagger-'));
    const fs = createFileSystem(dir);
    const api = createApiManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    const result = await api.generateDocs({
      provider: 'swagger',
      title: 'Shop API',
      version: '2.0.0',
    });

    expect(result.dependencies['@fastify/swagger-ui']).toBeDefined();

    const openapi = await readFile(join(dir, 'openapi.json'), 'utf8');
    expect(openapi).toContain('Shop API');
    expect(openapi).toContain('/health');

    const routes = await readFile(join(dir, 'src/docs/docs.routes.ts'), 'utf8');
    expect(routes).toContain('@fastify/swagger-ui');
    expect(routes).toContain('/docs');

    const featureRoutes = await readFile(join(dir, 'src/routes/features.ts'), 'utf8');
    expect(featureRoutes).toContain('registerDocsRoutes');
  });

  it('generates scalar provider routes', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-api-scalar-'));
    const fs = createFileSystem(dir);
    const api = createApiManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    const result = await api.generateDocs({ provider: 'scalar', title: 'API' });
    expect(result.dependencies['@scalar/fastify-api-reference']).toBeDefined();

    const routes = await readFile(join(dir, 'src/docs/docs.routes.ts'), 'utf8');
    expect(routes).toContain('@scalar/fastify-api-reference');
  });

  it('generates postman and bruno clients', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-api-clients-'));
    const fs = createFileSystem(dir);
    const api = createApiManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    const files = await api.generateClients({ postman: true, bruno: true, title: 'Demo' });
    expect(files).toContain('postman/collection.json');
    expect(files).toContain('bruno/bruno.json');

    const postman = await readFile(join(dir, 'postman/collection.json'), 'utf8');
    expect(postman).toContain('Health');
  });
});
