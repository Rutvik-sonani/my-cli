import { access, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSystem } from '@mycli-cli/filesystem';
import { afterEach, describe, expect, it } from 'vitest';
import { createAiManager } from '../src/index.js';

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('AiManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('generates AI scaffolding files', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-ai-'));
    const fs = createFileSystem(dir);
    const ai = createAiManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: join(import.meta.dirname, '..', '..', '..', 'apps', 'cli', 'templates'),
    });

    const result = await ai.setup({ appName: 'shop', provider: 'openai' });
    expect(result.files).toContain('src/ai/client.ts');
    expect(await fileExists(join(dir, 'src/ai/prompts.ts'))).toBe(true);
  });

  it('plans generation with dry-run', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-ai-gen-'));
    const ai = createAiManager({ cwd: dir, filesystem: createFileSystem(dir) });

    const result = await ai.generate({
      target: 'module',
      name: 'user',
      fields: 'email:email',
      dryRun: true,
    });

    expect(result.executed).toBe(false);
    expect(result.prompt).toContain('module');
    expect(result.prompt).toContain('user');
  });
});
