import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { CommandDefinition } from '@mycli-cli/command-engine';
import type { ConfigManager, PluginConfigEntry } from '@mycli-cli/config-manager';
import type { ApplicationContext } from '@mycli-cli/core';
import { PluginError, invariant } from '@mycli-cli/core';
import { type FileSystem, createFileSystem } from '@mycli-cli/filesystem';

export interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  main?: string;
  compatibility?: string;
  dependencies?: string[];
  keywords?: string[];
}

export interface PluginHooks {
  onInstall?(ctx: PluginContext): Promise<void> | void;
  onUninstall?(ctx: PluginContext): Promise<void> | void;
  beforeCommand?(ctx: PluginContext, commandName: string): Promise<void> | void;
  afterCommand?(ctx: PluginContext, commandName: string): Promise<void> | void;
  beforeGenerate?(ctx: PluginContext, generatorName: string): Promise<void> | void;
  afterGenerate?(ctx: PluginContext, generatorName: string): Promise<void> | void;
}

export interface PluginContext {
  app: ApplicationContext;
  config: ConfigManager;
  plugin: Plugin;
  options: Record<string, unknown>;
}

export interface Plugin {
  name: string;
  version: string;
  description?: string;
  install?(ctx: PluginContext): Promise<void> | void;
  uninstall?(ctx: PluginContext): Promise<void> | void;
  commands?(): CommandDefinition[];
  templates?(): string[];
  generators?(): string[];
  dependencies?(): Record<string, string>;
  hooks?(): PluginHooks;
}

export interface LoadedPlugin {
  plugin: Plugin;
  manifest: PluginManifest;
  path: string;
  enabled: boolean;
  options: Record<string, unknown>;
}

export interface PluginManagerOptions {
  app: ApplicationContext;
  config: ConfigManager;
  searchPaths?: string[];
  filesystem?: FileSystem;
}

/**
 * Discovers, loads, and manages MyCLI plugins.
 * Everything in MyCLI is plugin-based — official and community plugins share this API.
 */
export class PluginManager {
  private readonly app: ApplicationContext;
  private readonly config: ConfigManager;
  private readonly fs: FileSystem;
  private readonly searchPaths: string[];
  private readonly loaded = new Map<string, LoadedPlugin>();

  constructor(options: PluginManagerOptions) {
    this.app = options.app;
    this.config = options.config;
    this.fs = options.filesystem ?? createFileSystem(options.app.cwd);
    this.searchPaths = options.searchPaths ?? [
      join(options.app.cwd, 'plugins'),
      join(options.app.cwd, 'node_modules'),
    ];
  }

  async discover(): Promise<LoadedPlugin[]> {
    const configured = this.config.get().plugins ?? [];
    const results: LoadedPlugin[] = [];

    for (const entry of configured) {
      if (entry.enabled === false) {
        continue;
      }
      const loaded = await this.load(entry.name, entry);
      results.push(loaded);
    }

    // Also discover local plugins/official and plugins/community without requiring config
    for (const base of ['plugins/official', 'plugins/community']) {
      if (!(await this.fs.isDirectory(base))) {
        continue;
      }
      const entries = await this.fs.list(base);
      for (const entry of entries.filter((e) => e.isDirectory)) {
        const name = entry.relativePath.split(/[\\/]/).pop();
        if (!name || this.loaded.has(name) || this.loaded.has(`@mycli-cli/${name}`)) {
          continue;
        }
        try {
          const loaded = await this.loadFromPath(entry.path);
          results.push(loaded);
        } catch {
          // Skip invalid plugin directories during discovery
        }
      }
    }

    return results;
  }

  async load(name: string, entry: PluginConfigEntry = { name }): Promise<LoadedPlugin> {
    if (this.loaded.has(name)) {
      return this.loaded.get(name)!;
    }

    const path = entry.path ?? (await this.resolvePluginPath(name));
    return this.loadFromPath(path, entry);
  }

  async loadFromPath(pluginPath: string, entry?: PluginConfigEntry): Promise<LoadedPlugin> {
    const manifest = await this.readManifest(pluginPath);
    const mainFile = manifest.main ?? 'dist/index.js';
    const entryPath = join(pluginPath, mainFile);
    const srcFallback = join(pluginPath, 'src/index.ts');

    let mod: { default?: Plugin; plugin?: Plugin } & Partial<Plugin>;
    try {
      mod = (await import(pathToFileURL(entryPath).href)) as typeof mod;
    } catch {
      try {
        mod = (await import(pathToFileURL(srcFallback).href)) as typeof mod;
      } catch (cause) {
        throw new PluginError(`Failed to load plugin at ${pluginPath}`, {
          code: 'PLUGIN_LOAD_FAILED',
          details: { pluginPath, mainFile },
          cause,
        });
      }
    }

    const plugin = normalizePlugin(mod, manifest);
    this.validatePlugin(plugin);

    const loaded: LoadedPlugin = {
      plugin,
      manifest,
      path: pluginPath,
      enabled: entry?.enabled !== false,
      options: entry?.options ?? {},
    };

    this.loaded.set(plugin.name, loaded);
    await this.app.events.emit('plugin:loaded', { name: plugin.name, version: plugin.version });
    return loaded;
  }

  get(name: string): LoadedPlugin | undefined {
    return this.loaded.get(name);
  }

  list(): LoadedPlugin[] {
    return [...this.loaded.values()];
  }

  getCommands(): CommandDefinition[] {
    const commands: CommandDefinition[] = [];
    for (const loaded of this.loaded.values()) {
      if (!loaded.enabled) continue;
      const pluginCommands = loaded.plugin.commands?.() ?? [];
      for (const cmd of pluginCommands) {
        commands.push({ ...cmd, plugin: loaded.plugin.name });
      }
    }
    return commands;
  }

  async install(
    name: string,
    options: Record<string, unknown> & { path?: string } = {},
  ): Promise<LoadedPlugin> {
    const { path, ...pluginOptions } = options;
    const entry: PluginConfigEntry = {
      name,
      enabled: true,
      options: pluginOptions,
      path,
    };
    const loaded = await this.load(name, entry);
    const ctx = this.createContext(loaded);
    await loaded.plugin.install?.(ctx);
    await loaded.plugin.hooks?.().onInstall?.(ctx);

    const plugins = [...(this.config.get().plugins ?? [])];
    if (!plugins.some((p) => p.name === loaded.plugin.name)) {
      plugins.push({
        name: loaded.plugin.name,
        version: loaded.plugin.version,
        enabled: true,
        options: pluginOptions,
        path,
      });
      this.config.set('plugins', plugins);
      await this.config.save();
    }

    return loaded;
  }

  async uninstall(name: string): Promise<void> {
    const loaded = this.loaded.get(name);
    if (!loaded) {
      throw new PluginError(`Plugin not found: ${name}`, { code: 'PLUGIN_NOT_FOUND' });
    }
    const ctx = this.createContext(loaded);
    await loaded.plugin.uninstall?.(ctx);
    await loaded.plugin.hooks?.().onUninstall?.(ctx);
    this.loaded.delete(name);

    const plugins = (this.config.get().plugins ?? []).filter((p) => p.name !== name);
    this.config.set('plugins', plugins);
    await this.config.save();
  }

  createContext(loaded: LoadedPlugin): PluginContext {
    return {
      app: this.app,
      config: this.config,
      plugin: loaded.plugin,
      options: loaded.options,
    };
  }

  private async resolvePluginPath(name: string): Promise<string> {
    const slug = name.replace(/^@[^/]+\//, '');
    const candidates = [
      join(this.app.cwd, 'plugins', 'installed', slug),
      join(this.app.cwd, 'plugins', 'official', slug),
      join(this.app.cwd, 'plugins', 'community', slug),
      join(this.app.cwd, 'plugins', slug),
      join(this.app.cwd, 'node_modules', name),
      ...this.searchPaths.map((base) => join(base, name)),
      ...this.searchPaths.map((base) => join(base, slug)),
    ];

    for (const candidate of candidates) {
      if (await this.hasPluginManifest(candidate)) {
        return candidate;
      }
    }

    throw new PluginError(`Plugin not found: ${name}`, {
      code: 'PLUGIN_NOT_FOUND',
      details: { name, searched: candidates },
    });
  }

  private async hasPluginManifest(pluginPath: string): Promise<boolean> {
    try {
      const { access } = await import('node:fs/promises');
      await access(join(pluginPath, 'plugin.json'));
      return true;
    } catch {
      try {
        const { access } = await import('node:fs/promises');
        await access(join(pluginPath, 'package.json'));
        return true;
      } catch {
        return false;
      }
    }
  }

  private async readManifest(pluginPath: string): Promise<PluginManifest> {
    const manifestPath = join(pluginPath, 'plugin.json');
    try {
      const { readFile } = await import('node:fs/promises');
      const raw = await readFile(manifestPath, 'utf8');
      const manifest = JSON.parse(raw) as PluginManifest;
      invariant(manifest.name, 'plugin.json must include name');
      invariant(manifest.version, 'plugin.json must include version');
      return manifest;
    } catch {
      return this.readManifestFromPackageJson(pluginPath);
    }
  }

  private async readManifestFromPackageJson(pluginPath: string): Promise<PluginManifest> {
    const packagePath = join(pluginPath, 'package.json');
    try {
      const { readFile } = await import('node:fs/promises');
      const raw = await readFile(packagePath, 'utf8');
      const pkg = JSON.parse(raw) as {
        name?: string;
        version?: string;
        description?: string;
      };
      const slug = pluginPath.split(/[\\/]/).pop() ?? 'plugin';
      const name = pkg.name?.startsWith('@mycli-cli/plugin-')
        ? `@mycli-cli/${pkg.name.replace('@mycli-cli/plugin-', '')}`
        : `@mycli-cli/${slug}`;
      invariant(pkg.version, 'package.json must include version');
      return {
        name,
        version: pkg.version,
        description: pkg.description,
        main: 'dist/index.js',
        compatibility: '>=1.0.0',
      };
    } catch (cause) {
      throw new PluginError(`Invalid plugin manifest at ${pluginPath}`, {
        code: 'PLUGIN_INVALID',
        details: { pluginPath },
        cause,
      });
    }
  }

  private validatePlugin(plugin: Plugin): void {
    if (!plugin.name || !plugin.version) {
      throw new PluginError('Plugin must declare name and version', { code: 'PLUGIN_INVALID' });
    }
  }
}

function normalizePlugin(
  mod: { default?: Plugin; plugin?: Plugin } & Partial<Plugin>,
  manifest: PluginManifest,
): Plugin {
  const candidate = mod.default ?? mod.plugin ?? mod;
  if (!candidate || typeof candidate !== 'object') {
    throw new PluginError('Plugin module must export a Plugin object', { code: 'PLUGIN_INVALID' });
  }

  return {
    name: (candidate as Plugin).name ?? manifest.name,
    version: (candidate as Plugin).version ?? manifest.version,
    description: (candidate as Plugin).description ?? manifest.description,
    install: (candidate as Plugin).install,
    uninstall: (candidate as Plugin).uninstall,
    commands: (candidate as Plugin).commands,
    templates: (candidate as Plugin).templates,
    generators: (candidate as Plugin).generators,
    dependencies: (candidate as Plugin).dependencies,
    hooks: (candidate as Plugin).hooks,
  };
}

export function definePlugin(plugin: Plugin): Plugin {
  return plugin;
}

export function createPluginManager(options: PluginManagerOptions): PluginManager {
  return new PluginManager(options);
}
