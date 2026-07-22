import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSystem } from '@mycli-cli/filesystem';
import { describe, expect, it } from 'vitest';
import { createTemplateEngine } from '../src/index.js';

describe('TemplateEngine', () => {
  it('renders strings with helpers', async () => {
    const engine = createTemplateEngine();
    const out = await engine.renderString('Hello <%= capitalize(name) %>', {
      data: { name: 'world' },
    });
    expect(out).toBe('Hello World');
  });

  it('renders a template directory', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mycli-tpl-'));
    const templates = join(dir, 'templates', 'sample');
    await mkdir(templates, { recursive: true });
    await writeFile(join(templates, '<%= name %>.txt.ejs'), 'Hi <%= name %>', 'utf8');

    const fs = createFileSystem(dir);
    const engine = createTemplateEngine({ filesystem: fs, templatesRoot: 'templates' });
    const outDir = join(dir, 'out');
    const results = await engine.renderDirectory('sample', outDir, {
      data: { name: 'user' },
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.destination).toContain('user.txt');
    expect(results[0]?.content).toBe('Hi user');
    await rm(dir, { recursive: true, force: true });
  });
});
