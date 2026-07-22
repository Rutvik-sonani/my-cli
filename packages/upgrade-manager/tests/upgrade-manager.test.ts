import { access, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createConfigManager } from '@mycli-cli/config-manager';
import { createFileSystem } from '@mycli-cli/filesystem';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createUpgradeManager } from '../src/index.js';

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('UpgradeManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('adds missing scaffold files without overwriting user modules', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-upgrade-'));
    const fs = createFileSystem(dir);
    await fs.writeJson('.myclirc.json', {
      version: '1.0.0',
      projectName: 'shop',
      paths: { modules: 'src/modules' },
    });
    await fs.ensureDir('src/modules/user');
    await fs.write('src/modules/user/user.service.ts', 'export class UserService {}');

    const upgrade = createUpgradeManager({ cwd: dir });
    const result = await upgrade.run({ cwd: dir, targetVersion: '1.1.0' });

    expect(result.toVersion).toBe('1.1.0');
    expect(await fileExists(join(dir, 'ENVIRONMENT.md'))).toBe(true);
    expect(await fileExists(join(dir, 'biome.json'))).toBe(true);
    expect(await fileExists(join(dir, 'src/modules/user/user.service.ts'))).toBe(true);

    const userService = await fs.read('src/modules/user/user.service.ts');
    expect(userService).toContain('UserService');
  });

  it('overwrites existing scaffold files when force is set', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-upgrade-force-'));
    const fs = createFileSystem(dir);
    await fs.writeJson('.myclirc.json', { version: '1.0.0', projectName: 'shop' });
    await fs.write('.editorconfig', 'custom\n');

    const upgrade = createUpgradeManager({ cwd: dir });
    await upgrade.run({ cwd: dir, targetVersion: '1.1.0', force: true });
    expect(await fs.read('.editorconfig')).toContain('root = true');
  });

  it('supports dry-run without writing files', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-upgrade-dry-'));
    const fs = createFileSystem(dir);
    await fs.writeJson('.myclirc.json', { version: '1.0.0' });

    const upgrade = createUpgradeManager({ cwd: dir });
    await upgrade.run({ cwd: dir, targetVersion: '1.1.0', dryRun: true });

    expect(await fileExists(join(dir, 'ENVIRONMENT.md'))).toBe(false);
    expect(await fileExists(join(dir, '.mycli/upgrade-state.json'))).toBe(false);
  });
});
