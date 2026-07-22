import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { TemplateError, invariant } from '@mycli-cli/core';
import { type FileSystem, createFileSystem } from '@mycli-cli/filesystem';
import ejs from 'ejs';

export interface TemplateMeta {
  name: string;
  version: string;
  description?: string;
  engine?: 'ejs';
  variables?: TemplateVariable[];
}

export interface TemplateVariable {
  name: string;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  default?: unknown;
  description?: string;
}

export interface RenderOptions {
  data: Record<string, unknown>;
  strict?: boolean;
}

export interface RenderFileResult {
  source: string;
  destination: string;
  content: string;
}

export interface TemplateEngineOptions {
  templatesRoot?: string;
  filesystem?: FileSystem;
  helpers?: Record<string, (value: string) => string>;
}

const DEFAULT_HELPERS: Record<string, (value: string) => string> = {
  upper: (value: string) => value.toUpperCase(),
  lower: (value: string) => value.toLowerCase(),
  capitalize: (value: string) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : value),
};

/**
 * EJS-based template engine with file/folder generation and template metadata.
 * Never concatenates strings for generation — always renders templates.
 */
export class TemplateEngine {
  private readonly fs: FileSystem;
  private readonly templatesRoot: string;
  private readonly helpers: Record<string, (value: string) => string>;

  constructor(options: TemplateEngineOptions = {}) {
    this.templatesRoot = options.templatesRoot ?? 'templates';
    this.fs = options.filesystem ?? createFileSystem(process.cwd());
    this.helpers = { ...DEFAULT_HELPERS, ...(options.helpers ?? {}) };
  }

  async renderString(template: string, options: RenderOptions): Promise<string> {
    try {
      return await ejs.render(
        template,
        { ...this.helpers, ...options.data },
        {
          async: true,
          strict: options.strict ?? false,
          rmWhitespace: false,
        },
      );
    } catch (cause) {
      throw new TemplateError('Failed to render template string', {
        code: 'TEMPLATE_RENDER_FAILED',
        cause,
      });
    }
  }

  async renderFile(templatePath: string, options: RenderOptions): Promise<string> {
    const absolute = this.resolveTemplatePath(templatePath);
    try {
      const content = await readFile(absolute, 'utf8');
      return this.renderString(content, options);
    } catch (cause) {
      throw new TemplateError(`Template not found: ${templatePath}`, {
        code: 'TEMPLATE_NOT_FOUND',
        details: { templatePath, absolute },
        cause,
      });
    }
  }

  /**
   * Renders a template file path that may itself contain EJS in the filename,
   * e.g. `<%= name %>.controller.ts.ejs` → `user.controller.ts`
   */
  async renderPath(templatePath: string, data: Record<string, unknown>): Promise<string> {
    const rendered = await this.renderString(templatePath, { data });
    return rendered.replace(/\.ejs$/i, '');
  }

  /**
   * Recursively render a template directory into an output directory.
   */
  async renderDirectory(
    templateDir: string,
    outputDir: string,
    options: RenderOptions & { overwrite?: boolean; dryRun?: boolean },
  ): Promise<RenderFileResult[]> {
    const sourceRoot = this.resolveTemplatePath(templateDir);
    const results: RenderFileResult[] = [];

    try {
      const info = await stat(sourceRoot);
      invariant(info.isDirectory(), `Template directory not found: ${templateDir}`);
    } catch (cause) {
      throw new TemplateError(`Template directory not found: ${templateDir}`, {
        code: 'TEMPLATE_NOT_FOUND',
        details: { templateDir },
        cause,
      });
    }

    const walk = async (current: string): Promise<void> => {
      const entries = await readdir(current, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'template.json' || entry.name === '.DS_Store') {
          continue;
        }
        const full = join(current, entry.name);
        if (entry.isDirectory()) {
          await walk(full);
          continue;
        }

        const rel = relative(sourceRoot, full);
        const renderedRel = await this.renderPath(rel, options.data);
        const destination = join(outputDir, renderedRel);
        const raw = await readFile(full, 'utf8');
        const content = full.endsWith('.ejs') ? await this.renderString(raw, options) : raw;

        results.push({ source: full, destination, content });

        if (!options.dryRun) {
          await this.fs.write(destination, content, {
            overwrite: options.overwrite ?? true,
            dryRun: false,
          });
        }
      }
    };

    await walk(sourceRoot);
    return results;
  }

  async loadMeta(templateDir: string): Promise<TemplateMeta | undefined> {
    const metaPath = join(this.resolveTemplatePath(templateDir), 'template.json');
    try {
      const raw = await readFile(metaPath, 'utf8');
      return JSON.parse(raw) as TemplateMeta;
    } catch {
      return undefined;
    }
  }

  resolveTemplatePath(...segments: string[]): string {
    const first = segments[0];
    if (first && (first.startsWith('/') || /^[A-Za-z]:/.test(first))) {
      return resolve(...segments);
    }
    return resolve(this.fs.getRoot(), this.templatesRoot, ...segments);
  }

  getTemplatesRoot(): string {
    return this.templatesRoot;
  }
}

export function createTemplateEngine(options?: TemplateEngineOptions): TemplateEngine {
  return new TemplateEngine(options);
}

export { resolveFeatureTemplatesRoot } from './paths.js';
