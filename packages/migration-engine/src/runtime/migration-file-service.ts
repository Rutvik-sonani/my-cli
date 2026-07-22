import { join } from 'node:path';
import type { MigrationFile } from '@mycli-cli/enterprise-core';
import type { FileSystem } from '@mycli-cli/filesystem';
import { MIGRATIONS_DIR } from '../config.js';

/**
 * Writes migration record files for auditability (does not mutate user code).
 */
export class MigrationFileService {
  constructor(private readonly fs: FileSystem) {}

  async writeMigration(options: {
    id: string;
    version: string;
    title: string;
    body: string;
    dryRun?: boolean;
  }): Promise<MigrationFile> {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${stamp}-${options.id}.md`;
    const path = join(MIGRATIONS_DIR, filename);
    const content = `# Migration: ${options.title}

- Id: ${options.id}
- Version: ${options.version}
- Created: ${new Date().toISOString()}

## Summary

${options.body}
`;

    if (!options.dryRun) {
      await this.fs.write(path, content);
    }

    return {
      id: options.id,
      version: options.version,
      title: options.title,
      path,
      createdAt: new Date().toISOString(),
    };
  }
}

export function createMigrationFileService(fs: FileSystem): MigrationFileService {
  return new MigrationFileService(fs);
}
