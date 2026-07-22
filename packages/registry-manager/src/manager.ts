import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type NpmRegistryClient, createNpmRegistryClient } from './npm.js';
import type {
  RegistryCatalog,
  RegistryEntry,
  RegistryPublishOptions,
  RegistryPublishResult,
  RegistrySearchOptions,
  RegistrySearchResult,
} from './types.js';

function parseCompatibility(range: string): { major: number; minor: number } | null {
  const match = range.match(/>=?\s*(\d+)\.(\d+)/);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]) };
}

/**
 * Local plugin registry catalog (plugins/plugins.json) with search and publish.
 */
export class RegistryManager {
  private catalog: RegistryCatalog | null = null;
  private readonly catalogPath: string;
  private readonly repoRoot: string;
  private readonly npm: NpmRegistryClient;

  constructor(options: { repoRoot: string; catalogPath?: string; npm?: NpmRegistryClient }) {
    this.repoRoot = options.repoRoot;
    this.catalogPath = options.catalogPath ?? join(options.repoRoot, 'plugins', 'plugins.json');
    this.npm = options.npm ?? createNpmRegistryClient();
  }

  async load(): Promise<RegistryCatalog> {
    if (this.catalog) return this.catalog;
    const raw = await readFile(this.catalogPath, 'utf8');
    this.catalog = JSON.parse(raw) as RegistryCatalog;
    return this.catalog;
  }

  async search(options: RegistrySearchOptions = {}): Promise<RegistrySearchResult> {
    const registry = options.registry ?? 'local';
    const query = (options.query ?? '').toLowerCase().trim();
    const limit = options.limit ?? 50;

    let entries: RegistryEntry[] = [];

    if (registry === 'local' || registry === 'all') {
      const catalog = await this.load();
      entries = catalog.plugins;
      if (query) {
        entries = entries.filter(
          (entry) =>
            entry.name.toLowerCase().includes(query) ||
            entry.slug?.toLowerCase().includes(query) ||
            entry.description?.toLowerCase().includes(query) ||
            entry.keywords?.some((k) => k.toLowerCase().includes(query)),
        );
      }
      entries = [...entries].sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0));
    }

    if (registry === 'npm' || registry === 'all') {
      const npmResults = await this.npm.search(query || 'mycli', limit);
      for (const pkg of npmResults) {
        if (entries.some((e) => e.npmPackage === pkg.name || e.name === pkg.name)) continue;
        entries.push({
          name: pkg.name.startsWith('@mycli-cli/plugin-')
            ? `@mycli-cli/${pkg.name.replace('@mycli-cli/plugin-', '')}`
            : pkg.name,
          npmPackage: pkg.name,
          version: pkg.version,
          description: pkg.description,
          keywords: pkg.keywords,
          slug: pkg.name.replace('@mycli-cli/plugin-', '').replace('@mycli-cli/', ''),
          compatibility: '>=1.0.0',
          downloads: 0,
        });
      }
    }

    return {
      entries: entries.slice(0, limit),
      total: entries.length,
    };
  }

  async get(name: string): Promise<RegistryEntry | undefined> {
    const catalog = await this.load();
    const normalized = name.toLowerCase();
    return catalog.plugins.find(
      (entry) =>
        entry.name.toLowerCase() === normalized ||
        entry.slug?.toLowerCase() === normalized.replace(/^@[^/]+\//, '') ||
        entry.npmPackage?.toLowerCase() === normalized,
    );
  }

  async listOfficial(): Promise<RegistryEntry[]> {
    const catalog = await this.load();
    return catalog.plugins;
  }

  validateCompatibility(entry: RegistryEntry, cliVersion: string): boolean {
    if (!entry.compatibility) return true;
    const required = parseCompatibility(entry.compatibility);
    if (!required) return true;
    const current = parseCompatibility(`>=${cliVersion}`);
    if (!current) return true;
    return (
      current.major > required.major ||
      (current.major === required.major && current.minor >= required.minor)
    );
  }

  resolvePluginPath(entry: RegistryEntry): string | undefined {
    const slug = entry.slug ?? entry.name.replace(/^@[^/]+\//, '');
    const candidates = [
      join(this.repoRoot, 'plugins', 'official', slug),
      join(this.repoRoot, 'plugins', 'community', slug),
      join(process.cwd(), 'plugins', 'official', slug),
      join(process.cwd(), 'plugins', 'community', slug),
      join(process.cwd(), 'plugins', 'installed', slug),
    ];
    for (const candidate of candidates) {
      if (
        existsSync(join(candidate, 'plugin.json')) ||
        existsSync(join(candidate, 'package.json'))
      ) {
        return candidate;
      }
    }
    return undefined;
  }

  async incrementDownloads(name: string, dryRun = false): Promise<void> {
    const catalog = await this.load();
    const entry = await this.get(name);
    if (!entry) return;

    const index = catalog.plugins.findIndex((p) => p.name === entry.name);
    if (index < 0) return;

    const current = catalog.plugins[index]!;
    catalog.plugins[index] = {
      ...current,
      downloads: (current.downloads ?? 0) + 1,
    };

    if (!dryRun) {
      await writeFile(this.catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
    }
    this.catalog = catalog;
  }

  async resolveFromNpm(name: string): Promise<RegistryEntry | undefined> {
    const npmName = name.startsWith('@')
      ? name
      : `@mycli-cli/plugin-${name.replace(/^@[^/]+\//, '')}`;
    const meta = await this.npm.getMetadata(npmName);
    if (!meta) return undefined;

    return {
      name: name.startsWith('@mycli-cli/') ? name : `@mycli-cli/${name}`,
      npmPackage: meta.name,
      version: meta.version,
      description: meta.description,
      slug: name.replace(/^@[^/]+\//, ''),
      compatibility: '>=1.0.0',
      keywords: meta.keywords,
      downloads: 0,
    };
  }

  planNpmInstall(entry: RegistryEntry, targetDir: string): string[] {
    const pkg = entry.npmPackage ?? entry.name;
    return this.npm.planInstall(pkg, targetDir);
  }

  getNpmClient(): NpmRegistryClient {
    return this.npm;
  }

  async publish(options: RegistryPublishOptions): Promise<RegistryPublishResult> {
    const catalog = await this.load();
    const existingIndex = catalog.plugins.findIndex((p) => p.name === options.entry.name);
    const entry: RegistryEntry = {
      ...options.entry,
      publishedAt: new Date().toISOString(),
      downloads: options.entry.downloads ?? 0,
    };

    if (existingIndex >= 0) {
      catalog.plugins[existingIndex] = { ...catalog.plugins[existingIndex], ...entry };
    } else {
      catalog.plugins.push(entry);
    }

    if (!options.dryRun) {
      await writeFile(this.catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
    }

    this.catalog = catalog;
    const npmCommands = options.publishToNpm
      ? ['npm publish --access public', '# from plugin package directory']
      : undefined;
    return { entry, catalogPath: this.catalogPath, npmCommands };
  }
}

export function createRegistryManager(options: {
  repoRoot: string;
  catalogPath?: string;
}): RegistryManager {
  return new RegistryManager(options);
}

export type {
  RegistryEntry,
  RegistryCatalog,
  RegistrySearchOptions,
  RegistrySearchResult,
  RegistryPublishOptions,
  RegistryPublishResult,
} from './types.js';
