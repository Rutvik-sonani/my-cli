import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createUiManager } from '../src/index.js';

const REPO_TEMPLATES = join(import.meta.dirname, '..', '..', '..', 'apps', 'cli', 'templates');

describe('UiManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('generates tailwind config files list', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-ui-'));
    const ui = createUiManager({ cwd: dir, templatesRoot: REPO_TEMPLATES });
    const result = await ui.setup({
      library: 'tailwind',
      targetDir: dir,
      dryRun: true,
    });
    expect(result.files).toContain('tailwind.config.js');
    expect(result.packages).toContain('tailwindcss');
  });

  it('includes mui theme in setup result', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-ui-mui-'));
    const ui = createUiManager({ cwd: dir, templatesRoot: REPO_TEMPLATES });
    const result = await ui.setup({ library: 'mui', targetDir: dir, dryRun: true });
    expect(result.files).toContain('src/theme.ts');
    expect(result.packages).toContain('@mui/material');
  });
});
