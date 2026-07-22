import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { BackupListOptions, BackupListResult } from './types.js';

export async function listBackups(options: BackupListOptions = {}): Promise<BackupListResult> {
  const cwd = options.cwd ?? process.cwd();
  const outputDir = join(cwd, options.outputDir ?? 'backups');

  try {
    const entries = await readdir(outputDir, { withFileTypes: true });
    const backups = await Promise.all(
      entries
        .filter((e) => e.isFile())
        .map(async (entry) => {
          const file = join(outputDir, entry.name);
          const info = await stat(file);
          return {
            file: join(options.outputDir ?? 'backups', entry.name),
            sizeBytes: info.size,
            createdAt: info.birthtime,
          };
        }),
    );

    backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return { backups };
  } catch {
    return { backups: [] };
  }
}
