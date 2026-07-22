import type { FileSystem } from '@mycli-cli/filesystem';
import type { NameVariants, RegistrationResult } from './../types.js';
import { upsertMarkedBlock } from './barrel.js';

const BEGIN = '// <mycli:routes>';
const END = '// </mycli:routes>';
const IMPORT_BEGIN = '// <mycli:route-imports>';
const IMPORT_END = '// </mycli:route-imports>';

/**
 * Registers module routes into src/routes/index.ts using marker blocks.
 * Generated route factories are imported and merged into `appRoutes`.
 */
export async function ensureRouteRegistration(options: {
  fs: FileSystem;
  names: NameVariants;
  modulesPath: string;
  routesPath?: string;
  dryRun?: boolean;
}): Promise<RegistrationResult> {
  const routesPath = options.routesPath ?? 'src/routes/index.ts';
  const importLine = `import { create${options.names.pascal}Routes } from '../${stripSrc(options.modulesPath)}/${options.names.kebab}/index.js';`;
  const registerLine = `  ...create${options.names.pascal}Routes(${options.names.camel}Controller),`;

  // Controllers are constructed in the provider layer; routes file imports factory only.
  // Use a lazy registration helper that accepts a controller map.
  const factoryRegister = `  ${options.names.camel}: create${options.names.pascal}Routes,`;

  const exists = await options.fs.exists(routesPath);
  let content = exists ? await options.fs.read(routesPath) : createRoutesSkeleton();

  if (content.includes(`create${options.names.pascal}Routes`)) {
    return { kind: 'routes', path: routesPath, action: 'skip', detail: 'already registered' };
  }

  content = upsertMarkedBlock(content, IMPORT_BEGIN, IMPORT_END, (block) => {
    const lines = block
      .split('\n')
      .map((l) => l.trimEnd())
      .filter(Boolean);
    if (!lines.includes(importLine)) {
      lines.push(importLine);
    }
    return `${lines.join('\n')}\n`;
  });

  content = upsertMarkedBlock(content, BEGIN, END, (block) => {
    const lines = block
      .split('\n')
      .map((l) => l.trimEnd())
      .filter(Boolean);
    if (!lines.some((l) => l.includes(`create${options.names.pascal}Routes`))) {
      lines.push(factoryRegister);
    }
    return `${lines.join('\n')}\n`;
  });

  // Keep registerLine referenced for future controller-wired variants
  void registerLine;

  if (!options.dryRun) {
    await options.fs.write(routesPath, content, { overwrite: true });
  }

  return {
    kind: 'routes',
    path: routesPath,
    action: exists ? 'update' : 'create',
    detail: `create${options.names.pascal}Routes`,
  };
}

function createRoutesSkeleton(): string {
  return `/**
 * Application route registry — maintained by MyCLI generators.
 *
 * Each entry is a factory: (controller) => route map.
 * Wire controllers from src/providers and mount with your HTTP framework adapter.
 */
${IMPORT_BEGIN}
${IMPORT_END}

export const routeFactories = {
${BEGIN}
${END}
} as const;

export type RouteFactoryMap = typeof routeFactories;
`;
}

function stripSrc(modulesPath: string): string {
  return modulesPath.replace(/^src\//, '');
}
