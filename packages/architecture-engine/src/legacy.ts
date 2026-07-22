import { createArchitectureManager } from '@mycli-cli/architecture-manager';
import type { LegacyArchitectureStyle } from './types.js';
import type { ArchitectureEngineSetupOptions, ArchitectureEngineSetupResult } from './types.js';

const LEGACY_LABELS: Record<LegacyArchitectureStyle, string> = {
  monolith: 'Monolith',
  monorepo: 'Monorepo',
  polyrepo: 'Polyrepo',
};

const LEGACY_MODULE_PATHS: Record<LegacyArchitectureStyle, string> = {
  monolith: 'src/modules',
  monorepo: 'apps/api/src/modules',
  polyrepo: 'src/modules',
};

/**
 * Delegates monolith / monorepo / polyrepo to @mycli-cli/architecture-manager for backward compatibility.
 */
export async function setupLegacyArchitecture(
  options: ArchitectureEngineSetupOptions & { style: LegacyArchitectureStyle },
  templatesRoot: string,
): Promise<ArchitectureEngineSetupResult> {
  const manager = createArchitectureManager({
    cwd: options.cwd,
    templatesRoot,
  });

  const result = await manager.setup({
    cwd: options.cwd,
    architecture: options.style,
    appName: options.appName,
    backend: options.backend,
    frontend: options.frontend,
    dryRun: options.dryRun,
  });

  return {
    files: result.files,
    style: options.style,
    label: LEGACY_LABELS[options.style],
    modulePaths: { modules: LEGACY_MODULE_PATHS[options.style] },
    dependencyRules: [],
  };
}
