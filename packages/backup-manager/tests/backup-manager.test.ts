import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { listBackups } from '../src/list.js';
import { createBackupManager } from '../src/manager.js';
import { planBackup, runBackup } from '../src/plan.js';

describe('backup plan', () => {
  it('plans postgresql backup command', () => {
    const plan = planBackup({
      database: 'postgresql',
      databaseUrl: 'postgresql://localhost/app',
      outputDir: 'backups',
    });
    expect(plan.commands[0]).toContain('pg_dump');
    expect(plan.outputFile).toMatch(/^backups\/postgresql-/);
  });

  it('plans mongodb archive backup', () => {
    const plan = planBackup({
      database: 'mongodb',
      databaseUrl: 'mongodb://localhost/app',
    });
    expect(plan.commands[0]).toContain('mongodump');
    expect(plan.outputFile).toContain('.archive');
  });
});

describe('backup run', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('dry-run does not execute commands', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-backup-'));
    const result = await runBackup(
      { database: 'sqlite', databaseUrl: 'file:./dev.db', cwd: dir, dryRun: true },
      async () => {
        throw new Error('should not execute');
      },
    );
    expect(result.executed).toBe(false);
    expect(result.commands[0]).toContain('cp');
  });

  it('lists backups in output directory', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-backup-list-'));
    const executor = async (command: string, cwd: string) => {
      const { writeFile, mkdir } = await import('node:fs/promises');
      const { dirname } = await import('node:path');
      const output = command.match(/"([^"]+)"$/)?.[1];
      if (!output) return;
      await mkdir(dirname(join(cwd, output)), { recursive: true });
      await writeFile(join(cwd, output), 'backup data');
    };

    await runBackup(
      { database: 'sqlite', databaseUrl: 'file:./dev.db', cwd: dir, outputDir: 'backups' },
      executor,
    );

    const listed = await listBackups({ cwd: dir, outputDir: 'backups' });
    expect(listed.backups.length).toBe(1);
  });
});

describe('BackupManager', () => {
  it('writes backup documentation', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mycli-backup-doc-'));
    const { createFileSystem } = await import('@mycli-cli/filesystem');
    const { join: joinPath, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const templatesRoot = joinPath(
      dirname(fileURLToPath(import.meta.url)),
      '..',
      '..',
      '..',
      'apps',
      'cli',
      'templates',
    );
    const fs = createFileSystem(dir);
    const backup = createBackupManager({ cwd: dir, filesystem: fs, templatesRoot });
    const path = await backup.writeDocs({ appName: 'shop', database: 'postgresql' });
    expect(path).toBe('docs/backup.md');
    await rm(dir, { recursive: true, force: true });
  });
});
