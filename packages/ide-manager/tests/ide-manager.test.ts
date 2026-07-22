import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSystem } from '@mycli/filesystem';
import { afterEach, describe, expect, it } from 'vitest';
import { createIdeManager } from '../src/index.js';
import { featureTemplatesRoot } from './helpers.js';

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('IdeManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('generates VS Code, Cursor, and IDE docs', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-ide-'));
    const fs = createFileSystem(dir);
    const ide = createIdeManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    const result = await ide.setupIde({ appName: 'shop', packageManager: 'pnpm' });

    expect(result.files).toContain('.vscode/settings.json');
    expect(result.files).toContain('.vscode/extensions.json');
    expect(result.files).toContain('.vscode/launch.json');
    expect(result.files).toContain('.cursor/rules/mycli-project.mdc');
    expect(result.files).toContain('IDE.md');

    const settings = await readFile(join(dir, '.vscode/settings.json'), 'utf8');
    expect(settings).toContain('formatOnSave');

    const rules = await readFile(join(dir, '.cursor/rules/mycli-project.mdc'), 'utf8');
    expect(rules).toContain('shop');
  });

  it('generates DevContainer configuration', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-devcontainer-'));
    const fs = createFileSystem(dir);
    const ide = createIdeManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    const result = await ide.setupDevcontainer({
      appName: 'api',
      nodeVersion: '22',
      port: 4000,
    });

    expect(result.files).toContain('.devcontainer/devcontainer.json');
    expect(result.files).toContain('IDE.md');

    const devcontainer = await readFile(join(dir, '.devcontainer/devcontainer.json'), 'utf8');
    expect(devcontainer).toContain('"name": "api"');
    expect(devcontainer).toContain('4000');
  });

  it('includes docker-compose devcontainer when requested', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-devcontainer-compose-'));
    const fs = createFileSystem(dir);
    const ide = createIdeManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    const result = await ide.setupDevcontainer({
      appName: 'svc',
      useDockerCompose: true,
    });

    expect(result.files).toContain('.devcontainer/docker-compose.yml');
  });

  it('supports dry-run', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-ide-dry-'));
    const fs = createFileSystem(dir);
    const ide = createIdeManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    await ide.setupIde({ appName: 'dry', dryRun: true });
    expect(await fileExists(join(dir, '.vscode/settings.json'))).toBe(false);
  });
});
