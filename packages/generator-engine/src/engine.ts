import type { ConfigManager } from '@mycli-cli/config-manager';
import { GeneratorError } from '@mycli-cli/core';
import type { ApplicationContext } from '@mycli-cli/core';
import { type FileSystem, createFileSystem } from '@mycli-cli/filesystem';
import { type TemplateEngine, createTemplateEngine } from '@mycli-cli/template-engine';
import { buildNames } from './names.js';
import { runAutoRegistration } from './registration/index.js';
import type { Generator, GeneratorContext, GeneratorHook, GeneratorResult } from './types.js';

export interface GeneratorEngineOptions {
  app: ApplicationContext;
  config: ConfigManager;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
  hooks?: GeneratorHook[];
}

/**
 * Laravel Artisan-style generator engine.
 * Generators render templates and write files; they never hardcode content via string concat.
 */
export class GeneratorEngine {
  private readonly app: ApplicationContext;
  private readonly config: ConfigManager;
  private readonly fs: FileSystem;
  private readonly templates: TemplateEngine;
  private readonly generators = new Map<string, Generator>();
  private readonly aliases = new Map<string, string>();
  private readonly hooks: GeneratorHook[] = [];

  constructor(options: GeneratorEngineOptions) {
    this.app = options.app;
    this.config = options.config;
    this.fs = options.filesystem ?? createFileSystem(options.app.cwd);
    this.templates =
      options.templateEngine ??
      createTemplateEngine({
        filesystem: this.fs,
        templatesRoot: options.templatesRoot ?? this.config.getPath('templates'),
      });
    if (options.hooks) {
      this.hooks.push(...options.hooks);
    }
  }

  register(generator: Generator): this {
    this.generators.set(generator.name, generator);
    for (const alias of generator.aliases ?? []) {
      this.aliases.set(alias, generator.name);
    }
    return this;
  }

  registerMany(generators: Generator[]): this {
    for (const generator of generators) {
      this.register(generator);
    }
    return this;
  }

  use(hook: GeneratorHook): this {
    this.hooks.push(hook);
    return this;
  }

  has(name: string): boolean {
    return this.generators.has(name) || this.aliases.has(name);
  }

  get(name: string): Generator | undefined {
    const resolved = this.aliases.get(name) ?? name;
    return this.generators.get(resolved);
  }

  list(): Generator[] {
    return [...this.generators.values()];
  }

  async run(
    name: string,
    entityName: string,
    options: Record<string, unknown> = {},
  ): Promise<GeneratorResult> {
    const generator = this.get(name);
    if (!generator) {
      throw new GeneratorError(`Generator not found: ${name}`, {
        code: 'GENERATOR_NOT_FOUND',
        details: { name, available: [...this.generators.keys()] },
      });
    }

    await this.app.events.emit('generator:start', { name: generator.name });

    const ctx: GeneratorContext = {
      app: this.app,
      config: this.config,
      fs: this.fs,
      templates: this.templates,
      name: entityName,
      options,
      dryRun: Boolean(options.dryRun ?? this.app.dryRun),
    };

    try {
      for (const hook of this.hooks) {
        await hook.beforeGenerate?.(ctx, generator.name);
      }

      let result = await generator.run(ctx);

      // If generator opted in via flag but didn't self-register, run pipeline
      if (generator.autoRegister && !result.registrations?.length) {
        result = await runAutoRegistration(ctx, generator.name, result);
      }

      for (const hook of this.hooks) {
        const next = await hook.afterGenerate?.(ctx, generator.name, result);
        if (next) {
          result = next;
        }
      }

      await this.app.events.emit('generator:end', {
        name: generator.name,
        filesWritten: result.files.filter((f) => f.action === 'create' || f.action === 'update')
          .length,
      });
      return result;
    } catch (cause) {
      if (cause instanceof GeneratorError) {
        throw cause;
      }
      throw new GeneratorError(`Generator failed: ${generator.name}`, {
        code: 'GENERATOR_FAILED',
        details: { generator: generator.name, entityName },
        cause,
      });
    }
  }

  static names(raw: string) {
    return buildNames(raw);
  }
}

export function createGeneratorEngine(options: GeneratorEngineOptions): GeneratorEngine {
  return new GeneratorEngine(options);
}
