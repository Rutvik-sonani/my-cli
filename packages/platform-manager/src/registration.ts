import type { FileSystem } from '@mycli-cli/filesystem';
import { upsertMarkedBlock } from '@mycli-cli/generator-engine';

const EXPORT_BEGIN = '// <mycli:exports>';
const EXPORT_END = '// </mycli:exports>';

export async function ensurePlatformBarrelExport(options: {
  fs: FileSystem;
  platformPath: string;
  folder: string;
  dryRun?: boolean;
}): Promise<{ path: string; action: 'create' | 'update' | 'skip' }> {
  const barrelPath = `${options.platformPath}/index.ts`;
  const exportLine = `export * from './${options.folder}/index.js';`;

  const exists = await options.fs.exists(barrelPath);
  let content = exists
    ? await options.fs.read(barrelPath)
    : `/**\n * Platform modules — maintained by MyCLI (\`my add observability|security|…\`).\n */\n${EXPORT_BEGIN}\n${EXPORT_END}\n`;

  if (content.includes(exportLine)) {
    return { path: barrelPath, action: 'skip' };
  }

  content = upsertMarkedBlock(content, EXPORT_BEGIN, EXPORT_END, (block) => {
    const lines = block
      .split('\n')
      .map((l) => l.trimEnd())
      .filter(Boolean);
    if (!lines.includes(exportLine)) lines.push(exportLine);
    return `${lines.join('\n')}\n`;
  });

  if (!options.dryRun) {
    await options.fs.write(barrelPath, content, { overwrite: true });
  }

  return { path: barrelPath, action: exists ? 'update' : 'create' };
}
