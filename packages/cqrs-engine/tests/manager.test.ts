import { mkdtemp, rm } from 'node:fs/promises';
import { access, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSystem } from '@mycli/filesystem';
import { createTemplateEngine } from '@mycli/template-engine';
import { afterEach, describe, expect, it } from 'vitest';
import { createCqrsManager } from '../src/manager.js';

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('CqrsManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('scaffolds CQRS buses, handlers, and docs', async () => {
    dir = await mkdtemp(join(tmpdir(), 'cqrs-engine-'));
    const fs = createFileSystem(dir);
    const templatesRoot = join(import.meta.dirname, '../../../apps/cli/templates');
    const manager = createCqrsManager({
      cwd: dir,
      filesystem: fs,
      templateEngine: createTemplateEngine({ filesystem: fs, templatesRoot }),
      templatesRoot,
    });

    const result = await manager.setup({ appName: 'demo', language: 'typescript' });

    expect(result.files.length).toBeGreaterThan(10);
    expect(await pathExists(join(dir, 'src/cqrs/command-bus.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/application/commands/CreateUserCommand.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'tests/cqrs/cqrs-buses.test.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'CQRS.md'))).toBe(true);

    const register = await readFile(join(dir, 'src/cqrs/register-handlers.ts'), 'utf8');
    expect(register).toContain('registerCqrsHandlers');
    expect(register).toContain('createValidationMiddleware');
  });
});
