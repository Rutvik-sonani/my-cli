import { join } from 'node:path';
import { type FileSystem, createFileSystem } from '@mycli-cli/filesystem';
import {
  type PluginScaffoldOptions,
  type PluginScaffoldResult,
  buildPluginScaffoldFiles,
  pluginSlugFromName,
} from './scaffold.js';

export async function createPluginScaffold(
  options: PluginScaffoldOptions & { filesystem?: FileSystem },
): Promise<PluginScaffoldResult> {
  const fs = options.filesystem ?? createFileSystem(process.cwd());
  const files = buildPluginScaffoldFiles(options);
  const written: string[] = [];

  for (const file of files) {
    const outPath = join(options.outputDir, file.path);
    if (!options.dryRun) {
      await fs.write(outPath, file.content);
    }
    written.push(outPath);
  }

  const slug = pluginSlugFromName(options.name);
  return {
    files: written,
    slug,
    npmPackage: options.name.startsWith('@mycli-cli/') ? `@mycli-cli/plugin-${slug}` : options.name,
  };
}

export {
  validatePluginManifest,
  pluginSlugFromName,
  npmPackageFromName,
  buildPluginScaffoldFiles,
} from './scaffold.js';
export type { PluginScaffoldOptions, PluginScaffoldResult } from './scaffold.js';

export { definePlugin, createPluginManager } from '@mycli-cli/plugin-system';
export type {
  Plugin,
  PluginContext,
  PluginHooks,
  PluginManifest,
  LoadedPlugin,
} from '@mycli-cli/plugin-system';
