import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSystem } from '@mycli/filesystem';
import { createTemplateEngine } from '@mycli/template-engine';
import { afterEach, describe, expect, it } from 'vitest';
import { createEventSystemManager } from '../src/manager.js';

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('EventSystemManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('scaffolds redis event-system with all folders', async () => {
    dir = await mkdtemp(join(tmpdir(), 'event-engine-'));
    const fs = createFileSystem(dir);
    const templatesRoot = join(import.meta.dirname, '../../../apps/cli/templates');
    const manager = createEventSystemManager({
      cwd: dir,
      filesystem: fs,
      templateEngine: createTemplateEngine({ filesystem: fs, templatesRoot }),
      templatesRoot,
    });

    const result = await manager.setup({
      appName: 'demo',
      provider: 'redis',
      language: 'typescript',
    });

    expect(result.files.length).toBeGreaterThan(15);
    expect(result.dependencies.ioredis).toBeDefined();
    expect(await pathExists(join(dir, 'src/event-system/publishers/redis.publisher.ts'))).toBe(
      true,
    );
    expect(await pathExists(join(dir, 'src/event-system/consumers/redis.consumer.ts'))).toBe(true);
    expect(
      await pathExists(join(dir, 'src/event-system/schemas/user-created.v1.schema.json')),
    ).toBe(true);
    expect(await pathExists(join(dir, 'tests/event-system/event-system.test.ts'))).toBe(true);

    const register = await readFile(join(dir, 'src/event-system/register-handlers.ts'), 'utf8');
    expect(register).toContain('registerEventHandlers');
    expect(register).toContain('RedisEventPublisher');
  });

  it('scaffolds kafka provider with kafkajs dependency', async () => {
    dir = await mkdtemp(join(tmpdir(), 'event-engine-kafka-'));
    const fs = createFileSystem(dir);
    const templatesRoot = join(import.meta.dirname, '../../../apps/cli/templates');
    const manager = createEventSystemManager({
      cwd: dir,
      filesystem: fs,
      templateEngine: createTemplateEngine({ filesystem: fs, templatesRoot }),
      templatesRoot,
    });

    const result = await manager.setup({
      appName: 'shop',
      provider: 'kafka',
      language: 'typescript',
    });

    expect(result.dependencies.kafkajs).toBeDefined();
    expect(await pathExists(join(dir, 'src/event-system/publishers/kafka.publisher.ts'))).toBe(
      true,
    );
  });
});
