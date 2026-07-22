import type { FileSystem } from '@mycli/filesystem';
import type { GeneratedFileAction, NameVariants, RegistrationResult } from '../types.js';

const BEGIN = '// <mycli:exports>';
const END = '// </mycli:exports>';

/**
 * Ensures a module is exported from the modules barrel file.
 * Uses marker comments so re-runs are idempotent and never clobber user code outside the block.
 */
export async function ensureModuleBarrelExport(options: {
  fs: FileSystem;
  modulesPath: string;
  names: NameVariants;
  dryRun?: boolean;
}): Promise<RegistrationResult> {
  const barrelPath = `${options.modulesPath}/index.ts`;
  const exportLine = `export * from './${options.names.kebab}/index.js';`;

  const exists = await options.fs.exists(barrelPath);
  let content = exists ? await options.fs.read(barrelPath) : createBarrelSkeleton();

  if (content.includes(exportLine)) {
    return { kind: 'barrel', path: barrelPath, action: 'skip', detail: 'already exported' };
  }

  content = upsertMarkedBlock(content, BEGIN, END, (block) => {
    const lines = block
      .split('\n')
      .map((l) => l.trimEnd())
      .filter((l) => l.length > 0);
    if (!lines.includes(exportLine)) {
      lines.push(exportLine);
    }
    return `${lines.join('\n')}\n`;
  });

  if (!options.dryRun) {
    await options.fs.write(barrelPath, content, { overwrite: true });
  }

  return {
    kind: 'barrel',
    path: barrelPath,
    action: exists ? 'update' : 'create',
    detail: exportLine,
  };
}

/**
 * Ensures a local module index.ts re-exports a newly generated file.
 */
export async function ensureLocalModuleExport(options: {
  fs: FileSystem;
  moduleDir: string;
  exportPath: string;
  dryRun?: boolean;
}): Promise<RegistrationResult> {
  const indexPath = `${options.moduleDir}/index.ts`;
  const exportLine = `export * from './${options.exportPath.replace(/\.ts$/, '.js')}';`;
  const exists = await options.fs.exists(indexPath);
  let content = exists ? await options.fs.read(indexPath) : `${BEGIN}\n${END}\n`;

  if (content.includes(exportLine)) {
    return { kind: 'barrel', path: indexPath, action: 'skip', detail: 'already exported' };
  }

  if (!content.includes(BEGIN)) {
    content = `${content.trimEnd()}\n\n${BEGIN}\n${exportLine}\n${END}\n`;
  } else {
    content = upsertMarkedBlock(content, BEGIN, END, (block) => {
      const lines = block
        .split('\n')
        .map((l) => l.trimEnd())
        .filter(Boolean);
      if (!lines.includes(exportLine)) {
        lines.push(exportLine);
      }
      return `${lines.join('\n')}\n`;
    });
  }

  if (!options.dryRun) {
    await options.fs.write(indexPath, content, { overwrite: true });
  }

  return {
    kind: 'barrel',
    path: indexPath,
    action: (exists ? 'update' : 'create') as GeneratedFileAction,
    detail: exportLine,
  };
}

function createBarrelSkeleton(): string {
  return `/**
 * Module barrel — maintained by MyCLI generators.
 * Add manual exports outside the marked block if needed.
 */
${BEGIN}
${END}
`;
}

export function upsertMarkedBlock(
  content: string,
  begin: string,
  end: string,
  mutate: (inner: string) => string,
): string {
  const beginIdx = content.indexOf(begin);
  const endIdx = content.indexOf(end);

  if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) {
    const addition = `\n${begin}\n${mutate('')}${end}\n`;
    return `${content.trimEnd()}${addition}`;
  }

  const before = content.slice(0, beginIdx + begin.length);
  const after = content.slice(endIdx);
  const inner = content.slice(beginIdx + begin.length, endIdx).replace(/^\n/, '');
  return `${before}\n${mutate(inner)}${after}`;
}
