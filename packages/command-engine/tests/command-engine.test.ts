import { ApplicationContext } from '@mycli-cli/core';
import { describe, expect, it } from 'vitest';
import { createCommandRegistry, defineCommand } from '../src/index.js';

describe('CommandRegistry', () => {
  it('parses commands, args, and options', () => {
    const registry = createCommandRegistry();
    registry.register(
      defineCommand({
        name: 'make',
        arguments: [
          { name: 'type', required: true },
          { name: 'name', required: true },
        ],
        options: [{ flags: '--fields <fields>' }],
        handler: async () => {},
      }),
    );

    const parsed = registry.parse(['make', 'module', 'user', '--fields', 'name:string']);
    expect(parsed.commandPath).toEqual(['make']);
    expect(parsed.args).toEqual({ type: 'module', name: 'user' });
    expect(parsed.options.fields).toBe('name:string');
  });

  it('executes handlers', async () => {
    const registry = createCommandRegistry();
    let called = false;
    registry.register(
      defineCommand({
        name: 'ping',
        handler: async () => {
          called = true;
        },
      }),
    );
    const app = new ApplicationContext({ environment: 'test', logLevel: 'silent' });
    await app.boot();
    await registry.execute(app, ['ping']);
    expect(called).toBe(true);
    await app.shutdown();
  });
});
