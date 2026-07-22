import { join } from 'node:path';
import type { CliEngine } from '@mycli-cli/cli-engine';
import { defineCommand } from '@mycli-cli/command-engine';
import { createConfigManager } from '@mycli-cli/config-manager';
import { createCommandGenerator, createQueryGenerator } from '@mycli-cli/cqrs-engine';
import { createDomainGenerator } from '@mycli-cli/domain-engine';
import { createIntegrationEventGenerator } from '@mycli-cli/event-engine';
import { createFileSystem } from '@mycli-cli/filesystem';
import {
  type FieldDefinition,
  type GeneratorEngine,
  type GeneratorHook,
  type GeneratorResult,
  appendCrudMigrations,
  createGeneratorEngine,
  createMigrationGenerator,
  createTemplateGenerator,
  parseFields,
} from '@mycli-cli/generator-engine';
import { createTemplateEngine } from '@mycli-cli/template-engine';
import { resolveTemplatesRoot } from '../paths.js';

const GENERATOR_TYPES = [
  'module',
  'domain',
  'command',
  'query',
  'integration-event',
  'crud',
  'controller',
  'service',
  'repository',
  'model',
  'dto',
  'middleware',
  'validator',
  'resource',
  'migration',
  'event',
  'queue',
  'mail',
] as const;

export function makeCommand(engine: CliEngine) {
  return defineCommand({
    name: 'make',
    description: 'Generate application code (modules, CRUD, controllers, …)',
    arguments: [
      {
        name: 'type',
        description: `Generator type: ${GENERATOR_TYPES.join(' | ')} | list`,
        required: true,
      },
      { name: 'name', description: 'Entity name', required: false },
    ],
    options: [
      {
        flags: '--fields <fields>',
        description: 'Fields e.g. name:string,price:number,email?:email,category:relation:Category',
      },
      { flags: '--dry-run', description: 'Preview without writing files', defaultValue: false },
      { flags: '--overwrite', description: 'Overwrite existing files', defaultValue: false },
      {
        flags: '--no-register',
        description: 'Skip auto route/barrel/provider registration',
        defaultValue: false,
      },
    ],
    examples: [
      'my make list',
      'my make module user',
      'my make domain user',
      'my make command create-order',
      'my make query list-orders',
      'my make integration-event order-placed',
      'my make module user --fields name:string,email:email',
      'my make crud product --fields name:string,price:number,description:text',
      'my make controller auth',
      'my make service payment',
      'my make repository product',
      'my make model order --fields total:number,status:string',
      'my make migration create_users',
      'my make queue send-welcome-email',
      'my make mail order-confirmation',
    ],
    async handler(ctx) {
      const t = (key: string, params?: Record<string, string>) => engine.i18n.t(key, params);
      const type = String(ctx.args.type);

      const config = createConfigManager({ cwd: engine.app.cwd });
      await config.load();

      const fs = createFileSystem(engine.app.cwd);
      const templates = createTemplateEngine({
        filesystem: fs,
        templatesRoot: resolveTemplatesRoot(),
      });

      const pluginHooks = buildPluginHooks(engine);
      const generators = createGeneratorEngine({
        app: engine.app,
        config,
        filesystem: fs,
        templateEngine: templates,
        hooks: pluginHooks,
      });

      const skipRegister = Boolean(ctx.options.noRegister);
      registerBuiltinGenerators(generators, { skipRegister });

      if (type === 'list' || type === '--list') {
        printGeneratorList(engine, generators, t);
        return;
      }

      const name = ctx.args.name as string | undefined;
      if (!name) {
        throw new Error(t('make_name_required', { type }));
      }

      if (!generators.has(type)) {
        engine.prompts.error(t('make_unknown_generator', { type }));
        printGeneratorList(engine, generators, t);
        throw new Error(`Unknown generator: ${type}`);
      }

      let fields: FieldDefinition[] | undefined =
        typeof ctx.options.fields === 'string' ? parseFields(ctx.options.fields) : undefined;

      const needsFields =
        type === 'crud' ||
        type === 'module' ||
        type === 'model' ||
        type === 'dto' ||
        type === 'resource' ||
        type === 'validator' ||
        type === 'migration';

      if (needsFields && !fields && engine.app.interactive && type === 'crud') {
        const raw = await engine.prompts.text({
          message: t('make_fields_prompt'),
          placeholder: 'name:string,price:number,description:text',
          defaultValue: 'name:string',
        });
        fields = parseFields(raw);
      }

      const result = await generators.run(type, name, {
        dryRun: ctx.options.dryRun,
        overwrite: ctx.options.overwrite,
        fields,
        noRegister: skipRegister,
      });

      printResult(engine, result, t);
    },
  });
}

function registerBuiltinGenerators(
  engine: GeneratorEngine,
  options: { skipRegister: boolean },
): void {
  const modulesPath = (ctx: { config: { getPath: (k: 'modules') => string } }) =>
    ctx.config.getPath('modules');

  const auto = options.skipRegister
    ? false
    : ({ barrel: true, routes: true, provider: true, openapi: true } as const);

  engine.registerMany([
    createTemplateGenerator({
      name: 'module',
      description: 'Generate a full feature module',
      aliases: ['mod'],
      templateDir: 'generators/module',
      outputDir: (ctx, names) => join(modulesPath(ctx), names.kebab),
      autoRegister: auto,
    }),
    createTemplateGenerator({
      name: 'crud',
      description: 'Generate a full CRUD module with field-aware artifacts',
      templateDir: 'generators/crud',
      outputDir: (ctx, names) => join(modulesPath(ctx), names.kebab),
      autoRegister: auto,
      postGenerate: async (ctx, _names, _fields, result) => appendCrudMigrations(ctx, result),
    }),
    createTemplateGenerator({
      name: 'controller',
      description: 'Generate a controller',
      templateDir: 'generators/controller',
      outputDir: (ctx, names) => join(modulesPath(ctx), names.kebab),
      localExport: (_ctx, names, outputDir) => ({
        moduleDir: outputDir,
        exportPath: `${names.kebab}.controller.ts`,
      }),
    }),
    createTemplateGenerator({
      name: 'service',
      description: 'Generate a service',
      templateDir: 'generators/service',
      outputDir: (ctx, names) => join(modulesPath(ctx), names.kebab),
      localExport: (_ctx, names, outputDir) => ({
        moduleDir: outputDir,
        exportPath: `${names.kebab}.service.ts`,
      }),
    }),
    createTemplateGenerator({
      name: 'repository',
      description: 'Generate a repository',
      templateDir: 'generators/repository',
      outputDir: (ctx, names) => join(modulesPath(ctx), names.kebab),
      localExport: (_ctx, names, outputDir) => ({
        moduleDir: outputDir,
        exportPath: `${names.kebab}.repository.ts`,
      }),
    }),
    createTemplateGenerator({
      name: 'model',
      description: 'Generate a model/interface',
      templateDir: 'generators/model',
      outputDir: (ctx, names) => join(modulesPath(ctx), names.kebab),
      localExport: (_ctx, names, outputDir) => ({
        moduleDir: outputDir,
        exportPath: `${names.kebab}.model.ts`,
      }),
    }),
    createTemplateGenerator({
      name: 'dto',
      description: 'Generate DTOs',
      templateDir: 'generators/dto',
      outputDir: (ctx, names) => join(modulesPath(ctx), names.kebab, 'dto'),
      localExport: (_ctx, names, outputDir) => ({
        moduleDir: join(outputDir, '..'),
        exportPath: `dto/${names.kebab}.dto.ts`,
      }),
    }),
    createTemplateGenerator({
      name: 'middleware',
      description: 'Generate middleware',
      templateDir: 'generators/middleware',
      outputDir: (ctx, names) => join(modulesPath(ctx), names.kebab, 'middleware'),
      localExport: (_ctx, names, outputDir) => ({
        moduleDir: join(outputDir, '..'),
        exportPath: `middleware/${names.kebab}.middleware.ts`,
      }),
    }),
    createTemplateGenerator({
      name: 'validator',
      description: 'Generate a validator',
      templateDir: 'generators/validator',
      outputDir: (ctx, names) => join(modulesPath(ctx), names.kebab, 'validator'),
      localExport: (_ctx, names, outputDir) => ({
        moduleDir: join(outputDir, '..'),
        exportPath: `validator/${names.kebab}.validator.ts`,
      }),
    }),
    createTemplateGenerator({
      name: 'resource',
      description: 'Generate an API resource transformer',
      templateDir: 'generators/resource',
      outputDir: (ctx, names) => join(modulesPath(ctx), names.kebab),
      localExport: (_ctx, names, outputDir) => ({
        moduleDir: outputDir,
        exportPath: `${names.kebab}.resource.ts`,
      }),
    }),
    createTemplateGenerator({
      name: 'event',
      description: 'Generate a domain event bus',
      aliases: ['events'],
      templateDir: 'generators/event',
      outputDir: (ctx, names) => join(modulesPath(ctx), names.kebab, 'events'),
      localExport: (_ctx, names, outputDir) => ({
        moduleDir: join(outputDir, '..'),
        exportPath: `events/${names.kebab}.events.ts`,
      }),
    }),
    createTemplateGenerator({
      name: 'queue',
      description: 'Generate a named queue job and worker',
      templateDir: 'generators/queue',
      outputDir: (_ctx, names) => join('src', 'jobs', names.kebab),
    }),
    createTemplateGenerator({
      name: 'mail',
      description: 'Generate a named mailable class',
      templateDir: 'generators/mail',
      outputDir: () => join('src', 'mail'),
    }),
    createMigrationGenerator(),
    createDomainGenerator(),
    createCommandGenerator(),
    createQueryGenerator(),
    createIntegrationEventGenerator(),
  ]);
}

function buildPluginHooks(engine: CliEngine): GeneratorHook[] {
  const hooks: GeneratorHook[] = [];
  for (const loaded of engine.plugins.list()) {
    if (!loaded.enabled) continue;
    const pluginHooks = loaded.plugin.hooks?.();
    if (!pluginHooks) continue;
    hooks.push({
      name: loaded.plugin.name,
      beforeGenerate: pluginHooks.beforeGenerate
        ? async (_ctx, generatorName) => {
            await pluginHooks.beforeGenerate?.(engine.plugins.createContext(loaded), generatorName);
          }
        : undefined,
      afterGenerate: pluginHooks.afterGenerate
        ? async (_ctx, generatorName, result) => {
            await pluginHooks.afterGenerate?.(engine.plugins.createContext(loaded), generatorName);
            return result;
          }
        : undefined,
    });
  }
  return hooks;
}

function printGeneratorList(
  engine: CliEngine,
  generators: GeneratorEngine,
  t: (key: string, params?: Record<string, string>) => string,
): void {
  engine.prompts.note(
    generators
      .list()
      .map((g) => {
        const aliases = g.aliases?.length ? ` (aliases: ${g.aliases.join(', ')})` : '';
        return `${g.name}${aliases} — ${g.description ?? ''}`;
      })
      .join('\n'),
    t('make_generators_title'),
  );
}

function printResult(
  engine: CliEngine,
  result: GeneratorResult,
  t: (key: string, params?: Record<string, string>) => string,
): void {
  engine.prompts.success(t('make_generated', { generator: result.generator, name: result.name }));
  for (const file of result.files) {
    const icon = file.action === 'skip' ? '↷' : file.action === 'update' ? '✎' : '✔';
    console.log(`  ${icon} ${file.path} (${file.action})`);
  }
  if (result.registrations?.length) {
    console.log();
    engine.prompts.info(t('make_auto_registration'));
    for (const reg of result.registrations) {
      const icon = reg.action === 'skip' ? '↷' : reg.action === 'update' ? '✎' : '✔';
      console.log(
        `  ${icon} [${reg.kind}] ${reg.path}${reg.detail ? ` — ${reg.detail}` : ''} (${reg.action})`,
      );
    }
  }
}
