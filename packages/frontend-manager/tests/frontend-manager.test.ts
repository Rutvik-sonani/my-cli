import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createFrontendManager } from '../src/index.js';

const REPO_TEMPLATES = join(import.meta.dirname, '..', '..', '..', 'apps', 'cli', 'templates');

describe('FrontendManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('generates React Vite scaffold', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-fe-react-'));
    const fe = createFrontendManager({ cwd: dir, templatesRoot: REPO_TEMPLATES });
    const result = await fe.setup({
      cwd: dir,
      framework: 'react',
      appName: 'shop',
    });
    expect(result.files).toContain('frontend/src/App.tsx');
    const app = await readFile(join(dir, 'frontend/src/App.tsx'), 'utf8');
    expect(app).toContain('shop');
  });

  it('generates Next.js app router scaffold', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-fe-next-'));
    const fe = createFrontendManager({ cwd: dir, templatesRoot: REPO_TEMPLATES });
    const result = await fe.setup({
      cwd: dir,
      framework: 'next',
      appName: 'store',
    });
    expect(result.files).toContain('frontend/src/app/page.tsx');
  });
});
