import { ValidationError } from '@mycli/core';
import { type FileSystem, createFileSystem } from '@mycli/filesystem';
import { type TemplateEngine, createTemplateEngine } from '@mycli/template-engine';
import { buildEslintArchitectureConfig } from './eslint-config.js';
import { setupLegacyArchitecture } from './legacy.js';
import {
  getArchitectureProvider,
  isLegacyArchitectureStyle,
  listAllArchitectureStyles,
} from './providers/index.js';
import type {
  ArchitectureEngineSetupOptions,
  ArchitectureEngineSetupResult,
  ArchitectureStyle,
  ArchitectureStyleInfo,
} from './types.js';
import { loadDependencyRules, validateArchitectureBoundaries } from './validate.js';
import type { ArchitectureValidationResult } from './validate.js';

export interface ArchitectureEngineOptions {
  cwd?: string;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
}

/**
 * Enterprise architecture engine — selects a style provider and scaffolds
 * folder structure, dependency rules, and documentation.
 */
export class ArchitectureEngine {
  private readonly fs: FileSystem;
  private readonly templates: TemplateEngine;
  private readonly templatesRoot: string;

  constructor(options: ArchitectureEngineOptions = {}) {
    const cwd = options.cwd ?? process.cwd();
    this.templatesRoot = options.templatesRoot ?? 'templates';
    this.fs = options.filesystem ?? createFileSystem(cwd);
    this.templates =
      options.templateEngine ??
      createTemplateEngine({
        filesystem: this.fs,
        templatesRoot: this.templatesRoot,
      });
  }

  listStyles(): ArchitectureStyleInfo[] {
    return listAllArchitectureStyles().map((entry) => ({
      style: entry.style,
      label: entry.label,
      description: entry.description,
    }));
  }

  normalizeStyle(input: string): ArchitectureStyle | null {
    const normalized = input.trim().toLowerCase().replace(/_/g, '-');
    const aliases: Record<string, ArchitectureStyle> = {
      mvc: 'mvc',
      'modular-monolith': 'modular-monolith',
      modular: 'modular-monolith',
      'clean-architecture': 'clean-architecture',
      clean: 'clean-architecture',
      hexagonal: 'hexagonal',
      ports: 'hexagonal',
      'domain-driven-design': 'domain-driven-design',
      ddd: 'domain-driven-design',
      microservice: 'microservice',
      microservices: 'microservice',
      monolith: 'monolith',
      monorepo: 'monorepo',
      polyrepo: 'polyrepo',
    };
    return aliases[normalized] ?? null;
  }

  async setup(options: ArchitectureEngineSetupOptions): Promise<ArchitectureEngineSetupResult> {
    const style = options.style;

    if (isLegacyArchitectureStyle(style)) {
      return setupLegacyArchitecture({ ...options, style }, this.templatesRoot);
    }

    const provider = getArchitectureProvider(style);
    if (!provider) {
      throw new ValidationError(`Unknown architecture style: ${style}`, {
        code: 'VALIDATION_FAILED',
        details: { style, available: this.listStyles().map((s) => s.style) },
      });
    }

    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const data = {
      appName: options.appName,
      style: provider.style,
      label: provider.label,
      backend: options.backend ?? 'fastify',
      frontend: options.frontend ?? 'none',
      language: options.language ?? 'typescript',
    };
    const templateData = data as unknown as Record<string, unknown>;
    const written: string[] = [];

    for (const file of provider.getTemplateFiles()) {
      const content = await this.templates.renderFile(file.template, { data: templateData });
      if (!options.dryRun) {
        await fs.write(file.out, content);
      }
      written.push(file.out);
    }

    const rules = provider.getDependencyRules();
    const rulesContent = await this.templates.renderFile(
      'architecture-engine/shared/dependency-rules.json.ejs',
      {
        data: {
          ...data,
          rules,
        },
      },
    );
    const rulesPath = '.architecture/dependency-rules.json';
    if (!options.dryRun) {
      await fs.ensureDir('.architecture');
      await fs.write(rulesPath, rulesContent);
    }
    written.push(rulesPath);

    const boundariesContent = await this.templates.renderFile(
      'architecture-engine/shared/MODULE_BOUNDARIES.md.ejs',
      { data: { ...data, rules } },
    );
    const boundariesPath = '.architecture/MODULE_BOUNDARIES.md';
    if (!options.dryRun) {
      await fs.write(boundariesPath, boundariesContent);
    }
    written.push(boundariesPath);

    return {
      files: written,
      style: provider.style,
      label: provider.label,
      modulePaths: provider.getModulePaths(),
      dependencyRules: rules,
    };
  }

  async validate(cwd?: string): Promise<ArchitectureValidationResult> {
    return validateArchitectureBoundaries(cwd ?? this.fs.getRoot(), { fs: this.fs });
  }

  async setupEslint(
    options: { cwd?: string; dryRun?: boolean } = {},
  ): Promise<{ file: string; created: boolean }> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const rulesFile = await loadDependencyRules(cwd, fs);
    if (!rulesFile) {
      throw new ValidationError(
        'No .architecture/dependency-rules.json found. Run my create with an enterprise architecture style.',
        {
          code: 'VALIDATION_FAILED',
        },
      );
    }
    const { filename, content } = buildEslintArchitectureConfig(rulesFile);
    if (!options.dryRun) {
      await fs.write(filename, content);
    }
    return { file: filename, created: !options.dryRun };
  }
}

export function createArchitectureEngine(options?: ArchitectureEngineOptions): ArchitectureEngine {
  return new ArchitectureEngine(options);
}
