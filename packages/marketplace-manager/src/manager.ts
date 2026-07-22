import { cp, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PluginError } from '@mycli/core';
import { createFileSystem } from '@mycli/filesystem';
import type { PluginManager } from '@mycli/plugin-system';
import type { RegistryEntry, RegistryManager } from '@mycli/registry-manager';
import { execa } from 'execa';
import type {
  MarketplaceInstallOptions,
  MarketplaceInstallResult,
  MarketplacePublishOptions,
  MarketplacePublishResult,
} from './types.js';

/**
 * Plugin marketplace — install, update, uninstall, and publish via registry + plugin-system.
 */
export class MarketplaceManager {
  private readonly registry: RegistryManager;
  private readonly plugins: PluginManager;
  private readonly repoRoot: string;
  private readonly cwd: string;
  private readonly cliVersion: string;

  constructor(options: {
    registry: RegistryManager;
    plugins: PluginManager;
    repoRoot: string;
    cwd: string;
    cliVersion?: string;
  }) {
    this.registry = options.registry;
    this.plugins = options.plugins;
    this.repoRoot = options.repoRoot;
    this.cwd = options.cwd;
    this.cliVersion = options.cliVersion ?? '1.0.0';
  }

  async install(options: MarketplaceInstallOptions): Promise<MarketplaceInstallResult> {
    const source = options.source ?? 'auto';
    let entry = await this.registry.get(options.name);

    if (!entry && (source === 'npm' || source === 'auto')) {
      entry = await this.registry.resolveFromNpm(options.name);
    }

    if (!entry) {
      throw new PluginError(`Plugin not found in registry: ${options.name}`, {
        code: 'PLUGIN_NOT_FOUND',
      });
    }

    if (!this.registry.validateCompatibility(entry, this.cliVersion)) {
      throw new PluginError(
        `Plugin ${entry.name} requires compatibility ${entry.compatibility}, CLI is ${this.cliVersion}`,
        { code: 'PLUGIN_INVALID' },
      );
    }

    const sourcePath = this.registry.resolvePluginPath(entry);

    if (!sourcePath && entry.npmPackage && (source === 'npm' || source === 'auto')) {
      return this.installFromNpm(entry, options);
    }

    if (!sourcePath) {
      throw new PluginError(`Plugin source not found for ${entry.name}`, {
        code: 'PLUGIN_NOT_FOUND',
        details: { name: entry.name },
      });
    }

    const installPath = await this.ensureInstalledCopy(entry, sourcePath, options.dryRun);

    if (options.dryRun) {
      return {
        name: entry.name,
        version: entry.version,
        path: installPath,
        message: `Would install ${entry.name} from ${sourcePath}`,
      };
    }

    await this.plugins.install(entry.name, { ...options.options, path: installPath });
    await this.registry.incrementDownloads(entry.name);
    return {
      name: entry.name,
      version: entry.version,
      path: installPath,
      message: `Installed ${entry.name}@${entry.version}`,
    };
  }

  private async installFromNpm(
    entry: RegistryEntry,
    options: MarketplaceInstallOptions,
  ): Promise<MarketplaceInstallResult> {
    const slug = entry.slug ?? entry.name.replace(/^@mycli\//, '');
    const targetDir = join(this.cwd, 'plugins', 'installed', slug);
    const npmPackage = entry.npmPackage ?? entry.name;
    const commands = this.registry.planNpmInstall(entry, targetDir);

    if (options.dryRun) {
      return {
        name: entry.name,
        version: entry.version,
        path: join(targetDir, 'node_modules', npmPackage),
        message: `Would install from npm: ${commands.join('; ')}`,
      };
    }

    await mkdir(targetDir, { recursive: true });
    await execa('npm', ['install', npmPackage, '--prefix', targetDir, '--no-save'], {
      cwd: this.cwd,
      stdio: 'inherit',
    });

    const installPath = join(targetDir, 'node_modules', npmPackage);
    await this.plugins.install(entry.name, { ...options.options, path: installPath });
    await this.registry.incrementDownloads(entry.name);

    return {
      name: entry.name,
      version: entry.version,
      path: installPath,
      message: `Installed ${entry.name}@${entry.version} from npm`,
    };
  }

  async update(name: string, dryRun = false): Promise<MarketplaceInstallResult> {
    if (!dryRun) {
      try {
        await this.plugins.uninstall(name);
      } catch {
        // Plugin may not be loaded yet
      }
    }
    return this.install({ name, dryRun });
  }

  async uninstall(name: string): Promise<void> {
    await this.plugins.uninstall(name);
  }

  async publish(options: MarketplacePublishOptions): Promise<MarketplacePublishResult> {
    const fs = createFileSystem(options.pluginDir);
    const manifestPath = join(options.pluginDir, 'plugin.json');
    if (!(await fs.exists('plugin.json'))) {
      throw new PluginError('plugin.json is required to publish', { code: 'PLUGIN_INVALID' });
    }

    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as RegistryEntry;
    const slug =
      manifest.slug ?? manifest.name.replace(/^@mycli\//, '').replace(/^@mycli\/plugin-/, '');
    const communityPath = join(this.repoRoot, 'plugins', 'community', slug);

    if (!options.dryRun) {
      await cp(options.pluginDir, communityPath, { recursive: true, force: true });
    }

    const entry: RegistryEntry = {
      name: manifest.name,
      version: manifest.version,
      description: manifest.description,
      author: manifest.author,
      compatibility: manifest.compatibility ?? '>=1.0.0',
      slug,
      npmPackage: manifest.npmPackage,
      keywords: manifest.keywords,
      downloads: 0,
    };

    const result = await this.registry.publish({
      entry,
      dryRun: options.dryRun,
      publishToNpm: options.publishToNpm,
    });

    return {
      entry: result.entry,
      catalogPath: result.catalogPath,
      communityPath,
      npmCommands: result.npmCommands,
    };
  }

  private async ensureInstalledCopy(
    entry: RegistryEntry,
    sourcePath: string,
    dryRun?: boolean,
  ): Promise<string> {
    const slug = entry.slug ?? entry.name.replace(/^@mycli\//, '');
    const targetPath = join(this.cwd, 'plugins', 'installed', slug);

    if (sourcePath.startsWith(join(this.cwd, 'plugins', 'installed'))) {
      return sourcePath;
    }

    if (!dryRun) {
      await cp(sourcePath, targetPath, { recursive: true, force: true });
    }

    return targetPath;
  }
}

export function createMarketplaceManager(options: {
  registry: RegistryManager;
  plugins: PluginManager;
  repoRoot: string;
  cwd: string;
  cliVersion?: string;
}): MarketplaceManager {
  return new MarketplaceManager(options);
}

export type {
  MarketplaceInstallOptions,
  MarketplaceInstallResult,
  MarketplacePublishOptions,
  MarketplacePublishResult,
} from './types.js';
