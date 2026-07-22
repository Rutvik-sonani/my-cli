import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSystem } from '@mycli-cli/filesystem';
import { createTemplateEngine } from '@mycli-cli/template-engine';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ALL_UPGRADE_SCOPES,
  createMigrationManager,
  createUpgradeService,
  parseUpgradeScopes,
  resolveMigrationPaths,
} from '../src/index.js';

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('migration config', () => {
  it('resolves paths and parses scopes', () => {
    const paths = resolveMigrationPaths();
    expect(paths.root).toBe('src/migration');
    expect(paths.migrations).toBe(join('src/migration', 'migrations'));
    expect(parseUpgradeScopes('project,template')).toEqual(['project', 'template']);
    expect(parseUpgradeScopes(undefined)).toEqual(ALL_UPGRADE_SCOPES);
  });
});

describe('UpgradeService', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('backs up, upgrades project safely, and writes UPGRADE_REPORT.md', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mig-upgrade-'));
    const fs = createFileSystem(dir);
    await fs.writeJson('.myclirc.json', {
      version: '1.0.0',
      projectName: 'demo',
      paths: { modules: 'src/modules' },
    });
    await fs.ensureDir('src/modules/user');
    await fs.write('src/modules/user/user.service.ts', 'export class UserService {}');
    await fs.write('package.json', JSON.stringify({ name: 'demo', version: '1.0.0' }));

    const service = createUpgradeService({
      cwd: dir,
      filesystem: fs,
      cliVersion: '1.1.0',
    });

    const { report, reportPath } = await service.run({
      targetVersion: '1.1.0',
      scopes: ['project', 'cli'],
    });

    expect(reportPath).toBe('UPGRADE_REPORT.md');
    expect(report.backup).toBeDefined();
    expect(report.backup?.files).toContain('.myclirc.json');
    expect(await pathExists(join(dir, 'UPGRADE_REPORT.md'))).toBe(true);
    expect(await pathExists(join(dir, 'ENVIRONMENT.md'))).toBe(true);
    expect(await pathExists(join(dir, '.mycli/cli-upgrade-notes.md'))).toBe(true);

    const user = await fs.read('src/modules/user/user.service.ts');
    expect(user).toContain('UserService');

    const markdown = await readFile(join(dir, 'UPGRADE_REPORT.md'), 'utf8');
    expect(markdown).toContain('Upgrade Report');
    expect(markdown).toContain('never overwritten');

    const migrationEntries = await fs.list('.mycli/migrations');
    expect(migrationEntries.some((e) => e.relativePath.endsWith('.md'))).toBe(true);
  });

  it('supports dry-run without writing report or backups', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mig-dry-'));
    const fs = createFileSystem(dir);
    await fs.writeJson('.myclirc.json', { version: '1.0.0', projectName: 'demo' });

    const service = createUpgradeService({ cwd: dir, filesystem: fs, cliVersion: '1.1.0' });
    const { report } = await service.run({
      dryRun: true,
      targetVersion: '1.1.0',
      scopes: ['project', 'cli'],
    });

    expect(report.dryRun).toBe(true);
    expect(report.actions.some((a) => a.status === 'planned')).toBe(true);
    expect(await pathExists(join(dir, 'UPGRADE_REPORT.md'))).toBe(false);
    expect(await pathExists(join(dir, 'ENVIRONMENT.md'))).toBe(false);
  });

  it('upgrades installed templates with stamps and skips on re-run', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mig-tpl-'));
    const fs = createFileSystem(dir);
    await fs.writeJson('.myclirc.json', { version: '1.0.0', projectName: 'demo' });
    await mkdir(join(dir, 'templates/installed/api-crud'), { recursive: true });
    await writeFile(
      join(dir, 'templates/installed/installed.json'),
      JSON.stringify({
        installed: [
          {
            id: 'public/api-crud',
            name: 'api-crud',
            version: '1.0.0',
            path: 'templates/installed/api-crud',
            installedAt: new Date().toISOString(),
            visibility: 'public',
          },
        ],
      }),
    );

    const service = createUpgradeService({ cwd: dir, filesystem: fs });
    const first = await service.run({
      scopes: ['template'],
      skipBackup: true,
      targetVersion: '1.0.0',
    });
    expect(first.report.actions.some((a) => a.status === 'applied')).toBe(true);
    expect(await pathExists(join(dir, 'templates/installed/api-crud/.upgrade-stamp'))).toBe(true);

    const second = await service.run({
      scopes: ['template'],
      skipBackup: true,
      targetVersion: '1.0.0',
    });
    expect(second.report.actions.every((a) => a.status === 'skipped')).toBe(true);
  });
});

describe('MigrationManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('scaffolds migration engine sources', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mig-setup-'));
    const fs = createFileSystem(dir);
    const templatesRoot = join(import.meta.dirname, '../../../apps/cli/templates');
    const manager = createMigrationManager({
      cwd: dir,
      filesystem: fs,
      templateEngine: createTemplateEngine({ filesystem: fs, templatesRoot }),
      templatesRoot,
    });

    const result = await manager.setup({ appName: 'demo', language: 'typescript' });
    expect(result.files.length).toBeGreaterThan(7);
    expect(await pathExists(join(dir, 'src/migration/upgrade.service.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/migration/backup/backup.service.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'MIGRATION.md'))).toBe(true);
    expect(await pathExists(join(dir, 'tests/migration/migration.test.ts'))).toBe(true);
  });
});
