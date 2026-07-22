import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createArchitectureManager } from '../src/index.js';

const REPO_TEMPLATES = join(import.meta.dirname, '..', '..', '..', 'apps', 'cli', 'templates');

describe('ArchitectureManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('generates modular-monolith structure files', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-arch-'));
    const arch = createArchitectureManager({ cwd: dir, templatesRoot: REPO_TEMPLATES });
    const result = await arch.setup({
      cwd: dir,
      architecture: 'modular-monolith',
      appName: 'shop',
    });
    expect(result.files).toContain('ARCHITECTURE.md');
    expect(result.files).toContain('src/modules/README.md');
  });

  it('generates monorepo workspace files', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-arch-mono-'));
    const arch = createArchitectureManager({ cwd: dir, templatesRoot: REPO_TEMPLATES });
    const result = await arch.setup({
      cwd: dir,
      architecture: 'monorepo',
      appName: 'platform',
    });
    expect(result.files).toContain('pnpm-workspace.yaml');
    expect(result.files).toContain('packages/shared/package.json');
  });
});
