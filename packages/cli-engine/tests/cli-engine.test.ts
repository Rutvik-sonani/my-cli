import { defineCommand } from '@mycli/command-engine';
import { createI18n } from '@mycli/prompt-engine';
import { describe, expect, it, vi } from 'vitest';
import { createCliEngine } from '../src/index.js';

describe('CliEngine', () => {
  it('exposes i18n and passes it to prompts', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { operation_cancelled: 'Cancelled.' },
    });
    const engine = createCliEngine({ i18n, interactive: false, logLevel: 'silent' });
    expect(engine.i18n.t('operation_cancelled')).toBe('Cancelled.');
  });

  it('returns exit code 0 for --version', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const engine = createCliEngine({ version: '9.9.9', interactive: false, logLevel: 'silent' });
    const result = await engine.run(['--version']);
    expect(result.exitCode).toBe(0);
    expect(log).toHaveBeenCalledWith('my/9.9.9');
    log.mockRestore();
    await engine.shutdown();
  });

  it('prints help when no args are provided', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const engine = createCliEngine({ interactive: false, logLevel: 'silent' });
    engine.registerCommands([
      defineCommand({
        name: 'ping',
        description: 'Ping command',
        handler: async () => {},
      }),
    ]);
    const result = await engine.run([]);
    expect(result.exitCode).toBe(0);
    expect(log.mock.calls.flat().join('\n')).toContain('ping');
    log.mockRestore();
    await engine.shutdown();
  });

  it('executes registered commands', async () => {
    let called = false;
    const engine = createCliEngine({ interactive: false, logLevel: 'silent' });
    engine.registerCommands([
      defineCommand({
        name: 'hello',
        handler: async () => {
          called = true;
        },
      }),
    ]);
    await engine.initialize({ discoverPlugins: false });
    const result = await engine.run(['hello']);
    expect(result.exitCode).toBe(0);
    expect(called).toBe(true);
    await engine.shutdown();
  });
});
