import { describe, expect, it, vi } from 'vitest';
import { CommandBus, CommandBusError, EventBus, QueryBus } from '../src/runtime/buses.js';
import { createLoggingMiddleware, createValidationMiddleware } from '../src/runtime/middleware.js';

describe('CommandBus', () => {
  it('dispatches commands through middleware', async () => {
    const bus = new CommandBus();
    const order: string[] = [];

    bus
      .use(async (command, next) => {
        order.push(`before:${command.type}`);
        const result = await next();
        order.push(`after:${command.type}`);
        return result;
      })
      .register('ping', async () => {
        order.push('handler');
        return 'pong';
      });

    const result = await bus.execute({ type: 'ping' });
    expect(result).toBe('pong');
    expect(order).toEqual(['before:ping', 'handler', 'after:ping']);
  });

  it('throws when handler is missing', async () => {
    const bus = new CommandBus();
    await expect(bus.execute({ type: 'missing' })).rejects.toBeInstanceOf(CommandBusError);
  });

  it('runs validation middleware before handler', async () => {
    const bus = new CommandBus();
    bus
      .use(
        createValidationMiddleware(async (command) => {
          if (command.type === 'create' && !(command as { name?: string }).name) {
            throw new Error('name required');
          }
        }),
      )
      .register('create', async () => ({ id: '1' }));

    await expect(bus.execute({ type: 'create' })).rejects.toThrow('name required');
    await expect(
      bus.execute({ type: 'create', name: 'demo' } as { type: string }),
    ).resolves.toEqual({
      id: '1',
    });
  });

  it('logs via logging middleware', async () => {
    const logger = { info: vi.fn(), error: vi.fn() };
    const bus = new CommandBus();
    bus.use(createLoggingMiddleware('command', logger)).register('ping', async () => 'ok');

    await bus.execute({ type: 'ping' });
    expect(logger.info).toHaveBeenCalled();
  });
});

describe('QueryBus', () => {
  it('executes query handlers', async () => {
    const bus = new QueryBus();
    bus.register('user.get', async (query) => ({ id: (query as { id: string }).id }));

    const result = await bus.execute({ type: 'user.get', id: 'abc' });
    expect(result).toEqual({ id: 'abc' });
  });
});

describe('EventBus', () => {
  it('fans out to multiple subscribers', async () => {
    const bus = new EventBus();
    const seen: string[] = [];

    bus.subscribe('user.created', async (event) => {
      seen.push(`a:${(event as { payload: { id: string } }).payload.id}`);
    });
    bus.subscribe('user.created', async (event) => {
      seen.push(`b:${(event as { payload: { id: string } }).payload.id}`);
    });

    await bus.publish({
      type: 'user.created',
      occurredAt: new Date(),
      payload: { id: '1' },
    });

    expect(seen).toEqual(['a:1', 'b:1']);
  });
});
