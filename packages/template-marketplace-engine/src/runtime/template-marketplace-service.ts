import { join } from 'node:path';
import type {
  MarketplaceTemplate,
  TemplateCatalog,
  TemplateInstallRecord,
  TemplateSearchOptions,
  TemplateSearchResult,
  TemplateVisibility,
} from '@mycli/enterprise-core';
import { type FileSystem, createFileSystem } from '@mycli/filesystem';
import {
  INSTALLED_MANIFEST,
  INSTALLED_TEMPLATES_DIR,
  LOCAL_CATALOG_DIR,
  LOCAL_CATALOG_INDEX,
  createBuiltinTemplates,
  createTemplateStubFiles,
} from '../config.js';

export interface TemplateMarketplaceServiceOptions {
  cwd?: string;
  filesystem?: FileSystem;
  builtins?: MarketplaceTemplate[];
  cliVersion?: string;
}

function matchesQuery(template: MarketplaceTemplate, query?: string): boolean {
  if (!query?.trim()) return true;
  const q = query.trim().toLowerCase();
  const haystack = [
    template.id,
    template.name,
    template.description,
    template.author,
    ...(template.tags ?? []),
    template.organization ?? '',
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

function matchesVisibility(
  template: MarketplaceTemplate,
  visibility?: TemplateVisibility | TemplateVisibility[],
): boolean {
  if (!visibility) return true;
  const allowed = Array.isArray(visibility) ? visibility : [visibility];
  return allowed.includes(template.visibility);
}

function satisfiesCompatibility(required: string, cliVersion: string): boolean {
  const exact = required.match(/^\d+\.\d+\.\d+$/);
  if (exact) return required === cliVersion;

  const gte = required.match(/^>=\s*(\d+\.\d+\.\d+)$/);
  if (gte?.[1]) {
    return compareSemver(cliVersion, gte[1]) >= 0;
  }

  return true;
}

function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Searches, installs, and publishes marketplace templates.
 */
export class TemplateMarketplaceService {
  private readonly fs: FileSystem;
  private readonly builtins: MarketplaceTemplate[];
  private readonly cliVersion: string;

  constructor(options: TemplateMarketplaceServiceOptions = {}) {
    const cwd = options.cwd ?? process.cwd();
    this.fs = options.filesystem ?? createFileSystem(cwd);
    this.builtins = options.builtins ?? createBuiltinTemplates();
    this.cliVersion = options.cliVersion ?? '1.0.0';
  }

  async listAll(): Promise<MarketplaceTemplate[]> {
    const local = await this.loadLocalCatalog();
    const byId = new Map<string, MarketplaceTemplate>();
    for (const template of this.builtins) byId.set(template.id, template);
    for (const template of local.templates) byId.set(template.id, template);
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  async search(options: TemplateSearchOptions = {}): Promise<TemplateSearchResult> {
    let templates = await this.listAll();
    templates = templates.filter((template) => matchesQuery(template, options.query));
    templates = templates.filter((template) => matchesVisibility(template, options.visibility));

    if (options.organization) {
      const org = options.organization.toLowerCase();
      templates = templates.filter(
        (template) =>
          template.visibility !== 'organization' ||
          (template.organization ?? '').toLowerCase() === org,
      );
    }

    if (options.tags?.length) {
      const wanted = options.tags.map((t) => t.toLowerCase());
      templates = templates.filter((template) =>
        (template.tags ?? []).some((tag) => wanted.includes(tag.toLowerCase())),
      );
    }

    const limit = options.limit ?? 50;
    return { templates: templates.slice(0, limit), total: templates.length };
  }

  async get(nameOrId: string): Promise<MarketplaceTemplate | undefined> {
    const all = await this.listAll();
    const key = nameOrId.toLowerCase();
    return all.find(
      (template) =>
        template.id.toLowerCase() === key ||
        template.name.toLowerCase() === key ||
        template.id.toLowerCase().endsWith(`/${key}`),
    );
  }

  async install(options: {
    name: string;
    dryRun?: boolean;
    targetDir?: string;
  }): Promise<{
    template: MarketplaceTemplate;
    path: string;
    files: string[];
    message: string;
  }> {
    const template = await this.get(options.name);
    if (!template) {
      throw new Error(`Template not found: ${options.name}`);
    }

    if (!satisfiesCompatibility(template.compatibility, this.cliVersion)) {
      throw new Error(
        `Template ${template.name} requires compatibility ${template.compatibility}, CLI is ${this.cliVersion}`,
      );
    }

    const installRoot = options.targetDir ?? join(INSTALLED_TEMPLATES_DIR, template.name);
    const catalogSource =
      template.path != null ? join(LOCAL_CATALOG_DIR, template.path) : undefined;
    const hasCatalogCopy = catalogSource ? await this.fs.exists(catalogSource) : false;

    if (options.dryRun) {
      return {
        template,
        path: installRoot,
        files: hasCatalogCopy
          ? [join(installRoot, 'template.json')]
          : Object.keys(createTemplateStubFiles(template)).map((f) => join(installRoot, f)),
        message: `Would install ${template.name}@${template.version} → ${installRoot}`,
      };
    }

    const files: string[] = [];

    if (hasCatalogCopy && catalogSource) {
      await this.fs.copy(catalogSource, installRoot, { overwrite: true });
      const entries = await this.fs.list(installRoot, { recursive: true });
      for (const entry of entries) {
        if (!entry.isDirectory) files.push(entry.relativePath);
      }
    } else {
      const stubs = createTemplateStubFiles(template);
      for (const [file, content] of Object.entries(stubs)) {
        const out = join(installRoot, file);
        await this.fs.write(out, content);
        files.push(out);
      }
    }

    await this.recordInstall({
      id: template.id,
      name: template.name,
      version: template.version,
      installedAt: new Date().toISOString(),
      path: installRoot,
      visibility: template.visibility,
    });

    return {
      template,
      path: installRoot,
      files,
      message: `Installed ${template.name}@${template.version} → ${installRoot}`,
    };
  }

  async publish(options: {
    templateDir: string;
    dryRun?: boolean;
    visibility?: TemplateVisibility;
    organization?: string;
  }): Promise<{
    template: MarketplaceTemplate;
    catalogPath: string;
    message: string;
  }> {
    const dir = options.templateDir;
    const manifestPath = join(dir, 'template.json');
    if (!(await this.fs.exists(manifestPath))) {
      throw new Error(`template.json is required to publish (looked in ${dir})`);
    }

    const raw = await this.fs.readJson<Partial<MarketplaceTemplate> & { name: string }>(
      manifestPath,
    );
    if (!raw.name) throw new Error('template.json must include name');

    const visibility = options.visibility ?? raw.visibility ?? 'private';
    const organization = options.organization ?? raw.organization;
    const id =
      raw.id ??
      (visibility === 'organization' && organization
        ? `org/${organization}/${raw.name}`
        : visibility === 'public'
          ? `public/${raw.name}`
          : `private/${raw.name}`);

    const template: MarketplaceTemplate = {
      id,
      name: raw.name,
      version: raw.version ?? '1.0.0',
      author: raw.author ?? 'Unknown',
      description: raw.description ?? '',
      visibility,
      organization,
      compatibility: raw.compatibility ?? '>=1.0.0',
      requirements: raw.requirements,
      tags: raw.tags ?? [],
      downloads: raw.downloads ?? 0,
      path: raw.name,
    };

    const catalogPath = join(LOCAL_CATALOG_DIR, template.name);

    if (options.dryRun) {
      return {
        template,
        catalogPath,
        message: `Would publish ${template.name}@${template.version} → ${catalogPath}`,
      };
    }

    await this.fs.copy(dir, catalogPath, { overwrite: true });
    await this.fs.writeJson(join(catalogPath, 'template.json'), template);

    const catalog = await this.loadLocalCatalog();
    const others = catalog.templates.filter((entry) => entry.id !== template.id);
    const next: TemplateCatalog = {
      version: '1.0.0',
      updatedAt: new Date().toISOString(),
      templates: [...others, template],
    };
    await this.fs.writeJson(LOCAL_CATALOG_INDEX, next);

    return {
      template,
      catalogPath,
      message: `Published ${template.name}@${template.version} (${visibility}) → ${catalogPath}`,
    };
  }

  async listInstalled(): Promise<TemplateInstallRecord[]> {
    if (!(await this.fs.exists(INSTALLED_MANIFEST))) return [];
    try {
      const data = await this.fs.readJson<{ installed?: TemplateInstallRecord[] }>(
        INSTALLED_MANIFEST,
      );
      return data.installed ?? [];
    } catch {
      return [];
    }
  }

  private async recordInstall(record: TemplateInstallRecord): Promise<void> {
    const existing = await this.listInstalled();
    const next = existing.filter((item) => item.id !== record.id);
    next.push(record);
    await this.fs.writeJson(INSTALLED_MANIFEST, { installed: next });
  }

  private async loadLocalCatalog(): Promise<TemplateCatalog> {
    if (!(await this.fs.exists(LOCAL_CATALOG_INDEX))) {
      return { version: '1.0.0', updatedAt: new Date().toISOString(), templates: [] };
    }
    try {
      return await this.fs.readJson<TemplateCatalog>(LOCAL_CATALOG_INDEX);
    } catch {
      return { version: '1.0.0', updatedAt: new Date().toISOString(), templates: [] };
    }
  }
}

export function createTemplateMarketplaceService(
  options?: TemplateMarketplaceServiceOptions,
): TemplateMarketplaceService {
  return new TemplateMarketplaceService(options);
}
