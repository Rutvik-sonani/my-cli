import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import type { UpgradeBackupManifest } from '@mycli/enterprise-core';
import type { FileSystem } from '@mycli/filesystem';
import { BACKUP_ROOT, DEFAULT_BACKUP_TARGETS } from '../config.js';

/**
 * Creates a pre-upgrade backup of key project files (never overwrites live files).
 */
export class UpgradeBackupService {
  constructor(private readonly fs: FileSystem) {}

  async createBackup(
    options: {
      dryRun?: boolean;
      targets?: string[];
    } = {},
  ): Promise<UpgradeBackupManifest> {
    const id = randomUUID().slice(0, 8);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const path = join(BACKUP_ROOT, `${stamp}-${id}`);
    const targets = options.targets ?? DEFAULT_BACKUP_TARGETS;
    const files: string[] = [];

    for (const target of targets) {
      if (!(await this.fs.exists(target))) continue;
      const dest = join(path, target);
      if (!options.dryRun) {
        await this.fs.copy(target, dest, { overwrite: true });
      }
      files.push(target);
    }

    const manifest: UpgradeBackupManifest = {
      id,
      createdAt: new Date().toISOString(),
      path,
      files,
    };

    if (!options.dryRun) {
      await this.fs.writeJson(join(path, 'backup-manifest.json'), manifest);
    }

    return manifest;
  }
}

export function createUpgradeBackupService(fs: FileSystem): UpgradeBackupService {
  return new UpgradeBackupService(fs);
}
