import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createConfigManager } from '@mycli-cli/config-manager';
import { ApplicationContext } from '@mycli-cli/core';
import { createFileSystem } from '@mycli-cli/filesystem';
import { createTemplateEngine } from '@mycli-cli/template-engine';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  type GeneratorEngine,
  buildNames,
  createGeneratorEngine,
  createTemplateGenerator,
  ensureModuleBarrelExport,
  ensureProviderRegistration,
  ensureRouteRegistration,
  mapFields,
  parseFields,
  upsertMarkedBlock,
} from '../src/index.js';

const REPO_TEMPLATES = join(dirname(fileURLToPath(import.meta.url)), '../../../apps/cli/templates');

describe('buildNames', () => {
  it('builds naming variants', () => {
    const names = buildNames('order-items');
    expect(names.pascal).toBe('OrderItem');
    expect(names.kebabPlural).toBe('order-items');
    expect(names.camel).toBe('orderItem');
    expect(names.snakePlural).toBe('order_items');
  });
});

describe('parseFields / mapFields', () => {
  it('parses typed fields including optional and relations', () => {
    const fields = parseFields(
      'name:string,price:number,email?:email,category:relation:Category,active:boolean',
    );
    expect(fields).toEqual([
      { name: 'name', type: 'string', optional: false, relation: false, related: undefined },
      { name: 'price', type: 'number', optional: false, relation: false, related: undefined },
      { name: 'email', type: 'email', optional: true, relation: false, related: undefined },
      {
        name: 'category',
        type: 'relation',
        optional: false,
        relation: true,
        related: 'Category',
      },
      { name: 'active', type: 'boolean', optional: false, relation: false, related: undefined },
    ]);

    const mapped = mapFields(fields);
    expect(mapped.find((f) => f.name === 'category')?.propertyName).toBe('categoryId');
    expect(mapped.find((f) => f.name === 'email')?.tsType).toBe('string');
    expect(mapped.find((f) => f.name === 'email')?.swaggerFormat).toBe('email');
    expect(mapped.find((f) => f.name === 'price')?.tsType).toBe('number');
  });

  it('rejects empty field names', () => {
    expect(() => parseFields(':string')).toThrow();
  });
});

describe('upsertMarkedBlock', () => {
  it('inserts a marked block when missing', () => {
    const next = upsertMarkedBlock('header\n', '// <a>', '// </a>', () => 'line\n');
    expect(next).toContain('// <a>\nline\n// </a>');
  });

  it('updates an existing marked block', () => {
    const src = 'before\n// <a>\nold\n// </a>\nafter\n';
    const next = upsertMarkedBlock(src, '// <a>', '// </a>', () => 'new\n');
    expect(next).toContain('// <a>\nnew\n// </a>');
    expect(next).toContain('before');
    expect(next).toContain('after');
  });
});

describe('registration helpers', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-reg-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('creates and updates module barrel exports idempotently', async () => {
    const fs = createFileSystem(dir);
    const names = buildNames('user');
    await fs.ensureDir('src/modules');

    const first = await ensureModuleBarrelExport({
      fs,
      modulesPath: 'src/modules',
      names,
    });
    expect(first.action).toBe('create');

    const second = await ensureModuleBarrelExport({
      fs,
      modulesPath: 'src/modules',
      names,
    });
    expect(second.action).toBe('skip');

    const content = await fs.read('src/modules/index.ts');
    expect(content).toContain("export * from './user/index.js';");
    expect(content.match(/export \* from '\.\/user\/index\.js'/g)).toHaveLength(1);
  });

  it('registers routes and providers', async () => {
    const fs = createFileSystem(dir);
    const names = buildNames('product');

    const routes = await ensureRouteRegistration({
      fs,
      names,
      modulesPath: 'src/modules',
    });
    expect(routes.action).toBe('create');
    const routeFile = await fs.read('src/routes/index.ts');
    expect(routeFile).toContain('createProductRoutes');

    const providers = await ensureProviderRegistration({
      fs,
      names,
      modulesPath: 'src/modules',
    });
    expect(providers.action).toBe('create');
    const providerFile = await fs.read('src/providers/index.ts');
    expect(providerFile).toContain('ProductController');
    expect(providerFile).toContain('product:');
  });
});

describe('GeneratorEngine with real templates', () => {
  let dir: string;
  let engine: GeneratorEngine;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-gen-'));
    const app = new ApplicationContext({
      cwd: dir,
      environment: 'test',
      logLevel: 'silent',
    });
    await app.boot();
    const config = createConfigManager({ cwd: dir });
    await config.loadOrCreate({
      version: '1.0.0',
      paths: { modules: 'src/modules', templates: 'templates' },
    });
    const fs = createFileSystem(dir);
    const templates = createTemplateEngine({
      filesystem: fs,
      templatesRoot: REPO_TEMPLATES,
    });

    engine = createGeneratorEngine({
      app,
      config,
      filesystem: fs,
      templateEngine: templates,
    });

    engine.register(
      createTemplateGenerator({
        name: 'module',
        templateDir: 'generators/module',
        outputDir: (_ctx, names) => join('src/modules', names.kebab),
        autoRegister: true,
      }),
    );
    engine.register(
      createTemplateGenerator({
        name: 'crud',
        templateDir: 'generators/crud',
        outputDir: (_ctx, names) => join('src/modules', names.kebab),
        autoRegister: true,
      }),
    );
    engine.register(
      createTemplateGenerator({
        name: 'controller',
        templateDir: 'generators/controller',
        outputDir: (_ctx, names) => join('src/modules', names.kebab),
        localExport: (_ctx, names, outputDir) => ({
          moduleDir: outputDir,
          exportPath: `${names.kebab}.controller.ts`,
        }),
      }),
    );
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('generates a full module with auto-registration', async () => {
    const result = await engine.run('module', 'user', {
      fields: parseFields('name:string,email:email'),
    });

    expect(result.files.some((f) => f.action === 'create')).toBe(true);
    expect(result.files.map((f) => f.path).join('\n')).toContain('user.controller.ts');
    expect(result.files.map((f) => f.path).join('\n')).toContain('validator');
    expect(result.files.map((f) => f.path).join('\n')).toContain('events');
    expect(result.files.map((f) => f.path).join('\n')).toContain('middleware');

    const model = await readFile(join(dir, 'src/modules/user/user.model.ts'), 'utf8');
    expect(model).toContain('email: string');
    expect(model).toContain('name: string');

    const barrel = await readFile(join(dir, 'src/modules/index.ts'), 'utf8');
    expect(barrel).toContain("export * from './user/index.js';");

    const routes = await readFile(join(dir, 'src/routes/index.ts'), 'utf8');
    expect(routes).toContain('createUserRoutes');

    const providers = await readFile(join(dir, 'src/providers/index.ts'), 'utf8');
    expect(providers).toContain('UserService');

    expect(result.registrations?.some((r) => r.kind === 'barrel')).toBe(true);
    expect(result.registrations?.some((r) => r.kind === 'routes')).toBe(true);
    expect(result.registrations?.some((r) => r.kind === 'provider')).toBe(true);
  });

  it('generates CRUD with field-aware DTO and validator', async () => {
    const result = await engine.run('crud', 'product', {
      fields: parseFields('name:string,price:number,description:text,category:relation:Category'),
    });

    expect(result.files.length).toBeGreaterThan(8);
    const dto = await readFile(join(dir, 'src/modules/product/dto/index.ts'), 'utf8');
    expect(dto).toContain('price: number');
    expect(dto).toContain('categoryId: string');

    const validator = await readFile(
      join(dir, 'src/modules/product/validator/product.validator.ts'),
      'utf8',
    );
    expect(validator).toContain('price is required');

    const swagger = await readFile(join(dir, 'src/modules/product/product.swagger.ts'), 'utf8');
    expect(swagger).toContain('categoryId');
  });

  it('supports dry-run without writing files', async () => {
    const result = await engine.run('module', 'dry', { dryRun: true });
    expect(result.files.every((f) => f.action === 'create')).toBe(true);
    const fs = createFileSystem(dir);
    expect(await fs.exists('src/modules/dry/dry.controller.ts')).toBe(false);
  });

  it('skips existing files unless overwrite is set', async () => {
    await engine.run('controller', 'invoice');
    const second = await engine.run('controller', 'invoice');
    expect(second.files.every((f) => f.action === 'skip')).toBe(true);

    const overwritten = await engine.run('controller', 'invoice', { overwrite: true });
    expect(overwritten.files.some((f) => f.action === 'update')).toBe(true);
  });

  it('updates local module barrel for standalone controller', async () => {
    const result = await engine.run('controller', 'billing');
    expect(result.registrations?.some((r) => r.kind === 'barrel')).toBe(true);
    const index = await readFile(join(dir, 'src/modules/billing/index.ts'), 'utf8');
    expect(index).toContain("export * from './billing.controller.js';");
  });

  it('throws for unknown generators', async () => {
    await expect(engine.run('nope', 'x')).rejects.toMatchObject({ code: 'GENERATOR_NOT_FOUND' });
  });

  it('resolves aliases', () => {
    engine.register(
      createTemplateGenerator({
        name: 'modalias',
        aliases: ['ma'],
        templateDir: 'generators/controller',
        outputDir: () => 'src/modules/x',
      }),
    );
    expect(engine.has('ma')).toBe(true);
    expect(engine.get('ma')?.name).toBe('modalias');
  });

  it('invokes hooks', async () => {
    const calls: string[] = [];
    engine.use({
      name: 'test-hook',
      beforeGenerate: async (_ctx, name) => {
        calls.push(`before:${name}`);
      },
      afterGenerate: async (_ctx, name) => {
        calls.push(`after:${name}`);
      },
    });
    await engine.run('controller', 'hooked');
    expect(calls).toEqual(['before:controller', 'after:controller']);
  });
});

describe('openapi registration', () => {
  it('merges schemas into existing openapi.json', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mycli-oa-'));
    const fs = createFileSystem(dir);
    await fs.writeJson('openapi.json', {
      openapi: '3.1.0',
      info: { title: 'API', version: '1.0.0' },
      paths: {},
      components: { schemas: {} },
    });

    const app = new ApplicationContext({ cwd: dir, environment: 'test', logLevel: 'silent' });
    await app.boot();
    const config = createConfigManager({ cwd: dir });
    await config.loadOrCreate({ version: '1.0.0' });
    const templates = createTemplateEngine({
      filesystem: fs,
      templatesRoot: REPO_TEMPLATES,
    });
    const engine = createGeneratorEngine({
      app,
      config,
      filesystem: fs,
      templateEngine: templates,
    });
    engine.register(
      createTemplateGenerator({
        name: 'module',
        templateDir: 'generators/module',
        outputDir: (_ctx, names) => join('src/modules', names.kebab),
        autoRegister: true,
      }),
    );

    await engine.run('module', 'book', { fields: parseFields('title:string') });
    const doc = await fs.readJson<{
      components: { schemas: Record<string, unknown> };
      paths: Record<string, unknown>;
    }>('openapi.json');
    expect(doc.components.schemas.Book).toBeTruthy();
    expect(doc.paths['/books']).toBeTruthy();

    await rm(dir, { recursive: true, force: true });
  });
});

describe('ensureFeatureRouteRegistration', () => {
  it('registers auth/rbac/docs into features.ts idempotently', async () => {
    const { ensureFeatureRouteRegistration } = await import('../src/index.js');
    const dir = await mkdtemp(join(tmpdir(), 'mycli-feat-reg-'));
    const fs = createFileSystem(dir);

    const first = await ensureFeatureRouteRegistration({ fs, feature: 'auth' });
    expect(first.action).toBe('create');
    const second = await ensureFeatureRouteRegistration({ fs, feature: 'auth' });
    expect(second.action).toBe('skip');
    await ensureFeatureRouteRegistration({ fs, feature: 'rbac' });
    await ensureFeatureRouteRegistration({ fs, feature: 'docs' });

    const content = await fs.read('src/routes/features.ts');
    expect(content).toContain('registerAuthRoutes');
    expect(content).toContain('registerRbacRoutes');
    expect(content).toContain('registerDocsRoutes');
    expect(content.match(/registerAuthRoutes/g)?.length).toBe(2); // import + call

    await rm(dir, { recursive: true, force: true });
  });
});
