import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createCli } from '../src/cli.js';

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('my add event-system (Phase 4)', () => {
  let dir: string;
  let previousCwd: string;

  beforeEach(() => {
    previousCwd = process.cwd();
  });

  afterEach(async () => {
    process.chdir(previousCwd);
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  async function scaffoldProject() {
    dir = await mkdtemp(join(tmpdir(), 'mycli-event-system-'));
    process.chdir(dir);
    await writeFile(
      join(dir, '.myclirc.json'),
      JSON.stringify({
        version: '1.0.0',
        projectName: 'demo',
        language: 'typescript',
        paths: { eventSystem: 'src/event-system' },
      }),
    );
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'demo', version: '1.0.0', type: 'module' }),
    );
  }

  it('adds event-system with redis provider', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run(['add', 'event-system', '--provider', 'redis']);
    expect(result.exitCode).toBe(0);

    expect(await pathExists(join(dir, 'src/event-system/publishers/redis.publisher.ts'))).toBe(
      true,
    );
    expect(await pathExists(join(dir, 'src/event-system/consumers/redis.consumer.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/event-system/handlers/user-created.handler.ts'))).toBe(
      true,
    );
    expect(
      await pathExists(join(dir, 'src/event-system/schemas/user-created.v1.schema.json')),
    ).toBe(true);
    expect(await pathExists(join(dir, 'src/event-system/dead-letter/dead-letter.queue.ts'))).toBe(
      true,
    );
    expect(await pathExists(join(dir, 'tests/event-system/event-system.test.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'EVENT_SYSTEM.md'))).toBe(true);

    const register = await readFile(join(dir, 'src/event-system/register-handlers.ts'), 'utf8');
    expect(register).toContain('registerEventHandlers');
    expect(register).toContain('RedisEventPublisher');

    const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
    expect(pkg.dependencies.ioredis).toBeDefined();

    const config = JSON.parse(await readFile(join(dir, '.myclirc.json'), 'utf8'));
    expect(config.features['event-system']).toBe(true);
    expect(config.extensions.eventSystemProvider).toBe('redis');

    await cli.shutdown();
  });

  it('adds kafka event-system and generates integration events', async () => {
    await scaffoldProject();
    const cli = await createCli();

    expect((await cli.run(['add', 'event-system', '--provider', 'kafka'])).exitCode).toBe(0);
    expect((await cli.run(['make', 'integration-event', 'order-placed'])).exitCode).toBe(0);

    expect(await pathExists(join(dir, 'src/event-system/publishers/kafka.publisher.ts'))).toBe(
      true,
    );

    const event = await readFile(join(dir, 'src/event-system/events/OrderPlacedEvent.ts'), 'utf8');
    expect(event).toContain("type = 'order-placed'");

    const schema = await readFile(
      join(dir, 'src/event-system/schemas/order-placed.v1.schema.json'),
      'utf8',
    );
    expect(schema).toContain('OrderPlacedEvent');

    const handler = await readFile(
      join(dir, 'src/event-system/handlers/order-placed.handler.ts'),
      'utf8',
    );
    expect(handler).toContain('handleOrderPlaced');

    await cli.shutdown();
  });
});
