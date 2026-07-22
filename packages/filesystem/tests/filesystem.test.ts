import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createFileSystem } from '../src/index.js';

describe('FileSystem', () => {
  it('writes and reads files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mycli-fs-'));
    const fs = createFileSystem(dir);
    await fs.write('hello.txt', 'world');
    expect(await fs.read('hello.txt')).toBe('world');
    await fs.writeJson('data.json', { ok: true });
    expect(await fs.readJson<{ ok: boolean }>('data.json')).toEqual({ ok: true });
    await rm(dir, { recursive: true, force: true });
  });

  it('rejects path escape', () => {
    const fs = createFileSystem('/tmp/mycli-root');
    expect(() => fs.resolve('../outside')).toThrow();
  });
});
