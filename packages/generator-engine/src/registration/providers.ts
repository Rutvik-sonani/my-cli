import type { FileSystem } from '@mycli-cli/filesystem';
import type { NameVariants, RegistrationResult } from '../types.js';
import { upsertMarkedBlock } from './barrel.js';

const BEGIN = '// <mycli:providers>';
const END = '// </mycli:providers>';
const IMPORT_BEGIN = '// <mycli:provider-imports>';
const IMPORT_END = '// </mycli:provider-imports>';

/**
 * Registers module constructors into src/providers/index.ts for DI wiring.
 */
export async function ensureProviderRegistration(options: {
  fs: FileSystem;
  names: NameVariants;
  modulesPath: string;
  providersPath?: string;
  dryRun?: boolean;
}): Promise<RegistrationResult> {
  const providersPath = options.providersPath ?? 'src/providers/index.ts';
  const mod = stripSrc(options.modulesPath);
  const importBlock = [
    `import { ${options.names.pascal}Controller } from '../${mod}/${options.names.kebab}/index.js';`,
    `import { ${options.names.pascal}Service } from '../${mod}/${options.names.kebab}/index.js';`,
    `import { ${options.names.pascal}Repository } from '../${mod}/${options.names.kebab}/index.js';`,
  ];

  const providerEntry = `  ${options.names.camel}: {
    repository: ${options.names.pascal}Repository,
    service: ${options.names.pascal}Service,
    controller: ${options.names.pascal}Controller,
  },`;

  const exists = await options.fs.exists(providersPath);
  let content = exists ? await options.fs.read(providersPath) : createProvidersSkeleton();

  if (content.includes(`${options.names.pascal}Controller`)) {
    return { kind: 'provider', path: providersPath, action: 'skip', detail: 'already registered' };
  }

  content = upsertMarkedBlock(content, IMPORT_BEGIN, IMPORT_END, (block) => {
    const lines = block
      .split('\n')
      .map((l) => l.trimEnd())
      .filter(Boolean);
    for (const line of importBlock) {
      if (!lines.includes(line)) {
        lines.push(line);
      }
    }
    return `${lines.join('\n')}\n`;
  });

  content = upsertMarkedBlock(content, BEGIN, END, (block) => {
    const lines = block
      .split('\n')
      .map((l) => l.trimEnd())
      .filter(Boolean);
    if (!lines.some((l) => l.includes(`${options.names.camel}:`))) {
      lines.push(providerEntry);
    }
    return `${lines.join('\n')}\n`;
  });

  if (!options.dryRun) {
    await options.fs.write(providersPath, content, { overwrite: true });
  }

  return {
    kind: 'provider',
    path: providersPath,
    action: exists ? 'update' : 'create',
    detail: options.names.camel,
  };
}

/**
 * Instantiates a module's repository → service → controller graph.
 */
export function createProvidersSkeleton(): string {
  return `/**
 * Dependency providers — maintained by MyCLI generators.
 * Instantiate with: create${'{Pascal}'}Module() helpers or wire into your DI container.
 */
${IMPORT_BEGIN}
${IMPORT_END}

export const providers = {
${BEGIN}
${END}
} as const;

export function createModuleInstance<K extends keyof typeof providers>(
  key: K,
): {
  repository: InstanceType<(typeof providers)[K]['repository']>;
  service: InstanceType<(typeof providers)[K]['service']>;
  controller: InstanceType<(typeof providers)[K]['controller']>;
} {
  const def = providers[key];
  const repository = new def.repository();
  const service = new def.service(repository as never);
  const controller = new def.controller(service as never);
  return { repository, service, controller } as never;
}
`;
}

function stripSrc(modulesPath: string): string {
  return modulesPath.replace(/^src\//, '');
}
