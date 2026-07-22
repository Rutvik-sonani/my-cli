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

describe('my add cqrs (Phase 3)', () => {
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
    dir = await mkdtemp(join(tmpdir(), 'mycli-cqrs-'));
    process.chdir(dir);
    await writeFile(
      join(dir, '.myclirc.json'),
      JSON.stringify({
        version: '1.0.0',
        projectName: 'demo',
        language: 'typescript',
        paths: {
          application: 'src/application',
          cqrs: 'src/cqrs',
        },
      }),
    );
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'demo', version: '1.0.0', type: 'module' }),
    );
  }

  it('adds CQRS buses, example handlers, and documentation', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run(['add', 'cqrs']);
    expect(result.exitCode).toBe(0);

    expect(await pathExists(join(dir, 'src/cqrs/command-bus.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/cqrs/query-bus.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/cqrs/event-bus.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/application/commands/CreateUserCommand.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/application/queries/GetUserQuery.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/application/events/UserCreatedEvent.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'tests/cqrs/cqrs-buses.test.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'CQRS.md'))).toBe(true);

    const register = await readFile(join(dir, 'src/cqrs/register-handlers.ts'), 'utf8');
    expect(register).toContain('registerCqrsHandlers');
    expect(register).toContain('createValidationMiddleware');

    const config = JSON.parse(await readFile(join(dir, '.myclirc.json'), 'utf8'));
    expect(config.features.cqrs).toBe(true);

    await cli.shutdown();
  });

  it('generates command and query via my make', async () => {
    await scaffoldProject();
    const cli = await createCli();

    expect((await cli.run(['add', 'cqrs'])).exitCode).toBe(0);
    expect((await cli.run(['make', 'command', 'create-order'])).exitCode).toBe(0);
    expect((await cli.run(['make', 'query', 'list-orders'])).exitCode).toBe(0);

    const command = await readFile(
      join(dir, 'src/application/commands/CreateOrderCommand.ts'),
      'utf8',
    );
    expect(command).toContain("type = 'create-order.execute'");

    const handler = await readFile(
      join(dir, 'src/application/commands/handlers/CreateOrderHandler.ts'),
      'utf8',
    );
    expect(handler).toContain('registerCreateOrderCommand');

    const query = await readFile(join(dir, 'src/application/queries/ListOrderQuery.ts'), 'utf8');
    expect(query).toContain("type = 'list-order.read'");

    await cli.shutdown();
  });
});
