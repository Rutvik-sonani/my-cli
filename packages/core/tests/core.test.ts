import { describe, expect, it } from 'vitest';
import { ApplicationContext } from '../src/context/application-context.js';
import { Container } from '../src/di/container.js';
import { ConfigurationError } from '../src/errors/errors.js';
import { EventBus } from '../src/events/event-bus.js';
import { Result, err, ok } from '../src/result/result.js';
import { deepMerge } from '../src/utils/merge.js';
import {
  camelCase,
  kebabCase,
  pascalCase,
  pluralize,
  singularize,
  snakeCase,
} from '../src/utils/string.js';

describe('Container', () => {
  it('resolves singleton services once', () => {
    const container = new Container();
    let created = 0;
    container.registerSingleton('counter', () => {
      created += 1;
      return { created };
    });

    const a = container.resolve<{ created: number }>('counter');
    const b = container.resolve<{ created: number }>('counter');
    expect(a).toBe(b);
    expect(created).toBe(1);
  });

  it('resolves transient services separately', () => {
    const container = new Container();
    container.registerTransient('id', () => ({ value: Math.random() }));
    const a = container.resolve<{ value: number }>('id');
    const b = container.resolve<{ value: number }>('id');
    expect(a).not.toBe(b);
  });

  it('detects circular dependencies', () => {
    const container = new Container();
    container.registerSingleton('a', (c) => c.resolve('b'));
    container.registerSingleton('b', (c) => c.resolve('a'));
    expect(() => container.resolve('a')).toThrow(ConfigurationError);
  });
});

describe('EventBus', () => {
  it('emits events to registered handlers in order', async () => {
    const bus = new EventBus<{ ping: { n: number } }>();
    const order: number[] = [];
    bus.on('ping', async ({ n }) => {
      order.push(n);
    });
    bus.on('ping', async ({ n }) => {
      order.push(n + 1);
    });
    await bus.emit('ping', { n: 1 });
    expect(order).toEqual([1, 2]);
  });

  it('supports once handlers', async () => {
    const bus = new EventBus<{ tick: undefined }>();
    let count = 0;
    bus.once('tick', () => {
      count += 1;
    });
    await bus.emit('tick', undefined);
    await bus.emit('tick', undefined);
    expect(count).toBe(1);
  });
});

describe('string utils', () => {
  it('converts case styles', () => {
    expect(kebabCase('UserProfile')).toBe('user-profile');
    expect(camelCase('user-profile')).toBe('userProfile');
    expect(pascalCase('user_profile')).toBe('UserProfile');
    expect(snakeCase('UserProfile')).toBe('user_profile');
  });

  it('pluralizes and singularizes', () => {
    expect(pluralize('user')).toBe('users');
    expect(pluralize('category')).toBe('categories');
    expect(pluralize('person')).toBe('people');
    expect(singularize('users')).toBe('user');
    expect(singularize('categories')).toBe('category');
    expect(singularize('people')).toBe('person');
  });
});

describe('deepMerge', () => {
  it('merges nested objects', () => {
    const result = deepMerge({ a: 1, nested: { x: 1, y: 2 } }, { b: 2, nested: { y: 3, z: 4 } });
    expect(result).toEqual({ a: 1, b: 2, nested: { x: 1, y: 3, z: 4 } });
  });
});

describe('Result', () => {
  it('maps ok and err values', () => {
    expect(Result.map(ok(2), (n) => n * 2)).toEqual(ok(4));
    expect(Result.mapErr(err('x'), (e) => `${e}!`)).toEqual(err('x!'));
  });
});

describe('ApplicationContext', () => {
  it('boots and shuts down cleanly', async () => {
    const ctx = new ApplicationContext({ environment: 'test', logLevel: 'silent' });
    await ctx.boot();
    expect(ctx.isBooted()).toBe(true);
    await ctx.shutdown('test');
    expect(ctx.isBooted()).toBe(false);
  });
});
