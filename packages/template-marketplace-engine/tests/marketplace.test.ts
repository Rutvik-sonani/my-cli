import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSystem } from '@mycli-cli/filesystem';
import { createTemplateEngine } from '@mycli-cli/template-engine';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createBuiltinTemplates,
  createTemplateMarketplaceManager,
  createTemplateMarketplaceService,
  resolveTemplateMarketplacePaths,
} from '../src/index.js';

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('template marketplace config', () => {
  it('resolves default paths', () => {
    const paths = resolveTemplateMarketplacePaths();
    expect(paths.root).toBe('src/template-marketplace');
    expect(paths.catalog).toBe(join('src/template-marketplace', 'catalog'));
    expect(paths.client).toBe(join('src/template-marketplace', 'client'));
  });

  it('exposes builtin public and organization templates', () => {
    const builtins = createBuiltinTemplates();
    expect(builtins.length).toBeGreaterThanOrEqual(4);
    expect(builtins.some((t) => t.visibility === 'public')).toBe(true);
    expect(builtins.some((t) => t.visibility === 'organization')).toBe(true);
    expect(builtins.some((t) => t.visibility === 'private')).toBe(true);
  });
});

describe('TemplateMarketplaceService', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('searches by query and visibility', async () => {
    const service = createTemplateMarketplaceService();
    const api = await service.search({ query: 'api' });
    expect(api.templates.some((t) => t.name === 'api-crud')).toBe(true);

    const publicOnly = await service.search({ visibility: 'public' });
    expect(publicOnly.templates.every((t) => t.visibility === 'public')).toBe(true);

    const org = await service.search({ visibility: 'organization', organization: 'acme' });
    expect(org.templates).toHaveLength(1);
    expect(org.templates[0]?.name).toBe('acme-service');
  });

  it('installs a builtin template into templates/installed', async () => {
    dir = await mkdtemp(join(tmpdir(), 'tpl-install-'));
    const fs = createFileSystem(dir);
    const service = createTemplateMarketplaceService({ cwd: dir, filesystem: fs });

    const result = await service.install({ name: 'api-crud' });
    expect(result.template.name).toBe('api-crud');
    expect(await pathExists(join(dir, 'templates/installed/api-crud/template.json'))).toBe(true);
    expect(await pathExists(join(dir, 'templates/installed/api-crud/README.md'))).toBe(true);
    expect(await pathExists(join(dir, 'templates/installed/installed.json'))).toBe(true);

    const installed = await service.listInstalled();
    expect(installed.some((item) => item.name === 'api-crud')).toBe(true);
  });

  it('publishes a local template to the private catalog', async () => {
    dir = await mkdtemp(join(tmpdir(), 'tpl-publish-'));
    const fs = createFileSystem(dir);
    const source = join(dir, 'my-template');
    await mkdir(source, { recursive: true });
    await writeFile(
      join(source, 'template.json'),
      JSON.stringify({
        name: 'billing-hook',
        version: '1.2.0',
        author: 'Dev',
        description: 'Webhook billing template',
        tags: ['billing'],
      }),
    );
    await writeFile(join(source, 'README.md'), '# billing-hook\n');

    const service = createTemplateMarketplaceService({ cwd: dir, filesystem: fs });
    const published = await service.publish({
      templateDir: 'my-template',
      visibility: 'private',
    });

    expect(published.template.id).toBe('private/billing-hook');
    expect(await pathExists(join(dir, '.mycli/template-catalog/billing-hook/template.json'))).toBe(
      true,
    );
    expect(await pathExists(join(dir, '.mycli/template-catalog/index.json'))).toBe(true);

    const found = await service.search({ query: 'billing' });
    expect(found.templates.some((t) => t.name === 'billing-hook')).toBe(true);

    const installed = await service.install({ name: 'billing-hook' });
    expect(installed.path).toContain('templates/installed/billing-hook');
    const readme = await readFile(join(dir, 'templates/installed/billing-hook/README.md'), 'utf8');
    expect(readme).toContain('billing-hook');
  });

  it('supports dry-run install and publish', async () => {
    dir = await mkdtemp(join(tmpdir(), 'tpl-dry-'));
    const fs = createFileSystem(dir);
    await mkdir(join(dir, 'tpl'), { recursive: true });
    await writeFile(
      join(dir, 'tpl/template.json'),
      JSON.stringify({ name: 'dry-tpl', version: '1.0.0', author: 'x', description: 'd' }),
    );

    const service = createTemplateMarketplaceService({ cwd: dir, filesystem: fs });
    const install = await service.install({ name: 'auth-jwt', dryRun: true });
    expect(install.message).toMatch(/Would install/);
    expect(await pathExists(join(dir, 'templates/installed/auth-jwt'))).toBe(false);

    const publish = await service.publish({
      templateDir: 'tpl',
      dryRun: true,
      visibility: 'public',
    });
    expect(publish.message).toMatch(/Would publish/);
    expect(await pathExists(join(dir, '.mycli/template-catalog/dry-tpl'))).toBe(false);
  });
});

describe('TemplateMarketplaceManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('scaffolds marketplace client sources', async () => {
    dir = await mkdtemp(join(tmpdir(), 'tpl-mgr-'));
    const fs = createFileSystem(dir);
    const templatesRoot = join(import.meta.dirname, '../../../apps/cli/templates');
    const manager = createTemplateMarketplaceManager({
      cwd: dir,
      filesystem: fs,
      templateEngine: createTemplateEngine({ filesystem: fs, templatesRoot }),
      templatesRoot,
    });

    const result = await manager.setup({
      appName: 'demo',
      language: 'typescript',
    });

    expect(result.files.length).toBeGreaterThan(8);
    expect(
      await pathExists(join(dir, 'src/template-marketplace/client/marketplace.client.ts')),
    ).toBe(true);
    expect(
      await pathExists(join(dir, 'src/template-marketplace/providers/local.provider.ts')),
    ).toBe(true);
    expect(await pathExists(join(dir, 'TEMPLATE_MARKETPLACE.md'))).toBe(true);
    expect(await pathExists(join(dir, 'tests/template-marketplace/marketplace.test.ts'))).toBe(
      true,
    );

    const client = await readFile(
      join(dir, 'src/template-marketplace/client/marketplace.client.ts'),
      'utf8',
    );
    expect(client).toContain('MarketplaceClient');
  });
});
