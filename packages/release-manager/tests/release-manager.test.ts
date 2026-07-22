import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSystem } from '@mycli-cli/filesystem';
import { afterEach, describe, expect, it } from 'vitest';
import { createReleaseManager } from '../src/index.js';
import { featureTemplatesRoot } from './helpers.js';

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('ReleaseManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('generates changesets and release config via EJS templates', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-release-'));
    const fs = createFileSystem(dir);
    const release = createReleaseManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    const result = await release.setup({ appName: 'shop', strategy: 'semver' });

    expect(result.files).toContain('.changeset/config.json');
    expect(result.files).toContain('CHANGELOG.md');
    expect(result.files).toContain('release.config.js');
    expect(result.files).toContain('RELEASE.md');

    const changelog = await readFile(join(dir, 'CHANGELOG.md'), 'utf8');
    expect(changelog).toContain('shop');
    expect(changelog).toContain('semver');

    const config = JSON.parse(await readFile(join(dir, '.changeset/config.json'), 'utf8'));
    expect(config.baseBranch).toBe('main');

    const relConfig = await readFile(join(dir, 'release.config.js'), 'utf8');
    expect(relConfig).toContain('@semantic-release/github');
  });

  it('generates calendar versioning release config', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-release-calver-'));
    const fs = createFileSystem(dir);
    const release = createReleaseManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    const result = await release.setup({ appName: 'shop', strategy: 'calver' });

    expect(result.files).toContain('release.calver.config.js');
    expect(result.files).not.toContain('release.config.js');

    const changelog = await readFile(join(dir, 'CHANGELOG.md'), 'utf8');
    expect(changelog).toContain('calver');

    const relConfig = await readFile(join(dir, 'release.calver.config.js'), 'utf8');
    expect(relConfig).toContain('@semantic-release/exec');
  });

  it('supports dry-run', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-release-dry-'));
    const fs = createFileSystem(dir);
    const release = createReleaseManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    await release.setup({ appName: 'dry', dryRun: true });
    expect(await fileExists(join(dir, 'CHANGELOG.md'))).toBe(false);
  });
});
