import type {
  BusMiddleware,
  CommandHandler,
  CommandMessage,
  EventHandler,
  IntegrationEvent,
  QueryHandler,
  QueryMessage,
} from '@mycli/enterprise-core';

export class CommandBusError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommandBusError';
  }
}

/**
 * Command bus with middleware pipeline and sync/async handler support.
 */
export class CommandBus {
  private readonly handlers = new Map<string, CommandHandler<CommandMessage, unknown>>();
  private readonly middleware: BusMiddleware<CommandMessage>[] = [];

  use(middleware: BusMiddleware<CommandMessage>): this {
    this.middleware.push(middleware);
    return this;
  }

  register<C extends CommandMessage, R>(
    type: string,
    handler: CommandHandler<C, R>,
    _mode: 'sync' | 'async' = 'async',
  ): this {
    this.handlers.set(type, handler as CommandHandler<CommandMessage, unknown>);
    return this;
  }

  has(type: string): boolean {
    return this.handlers.has(type);
  }

  async execute<C extends CommandMessage, R>(command: C): Promise<R> {
    const handler = this.handlers.get(command.type);
    if (!handler) {
      throw new CommandBusError(`No handler registered for command: ${command.type}`);
    }

    let index = 0;
    const dispatch = async (): Promise<R> => {
      if (index < this.middleware.length) {
        const middleware = this.middleware[index++]!;
        return (await middleware(command, dispatch)) as R;
      }
      return (await handler(command)) as R;
    };

    return dispatch();
  }
}

export class QueryBusError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QueryBusError';
  }
}

/**
 * Query bus — read side with middleware pipeline.
 */
export class QueryBus {
  private readonly handlers = new Map<string, QueryHandler<QueryMessage, unknown>>();
  private readonly middleware: BusMiddleware<QueryMessage>[] = [];

  use(middleware: BusMiddleware<QueryMessage>): this {
    this.middleware.push(middleware);
    return this;
  }

  register<Q extends QueryMessage, R>(type: string, handler: QueryHandler<Q, R>): this {
    this.handlers.set(type, handler as QueryHandler<QueryMessage, unknown>);
    return this;
  }

  has(type: string): boolean {
    return this.handlers.has(type);
  }

  async execute<Q extends QueryMessage, R>(query: Q): Promise<R> {
    const handler = this.handlers.get(query.type);
    if (!handler) {
      throw new QueryBusError(`No handler registered for query: ${query.type}`);
    }

    let index = 0;
    const dispatch = async (): Promise<R> => {
      if (index < this.middleware.length) {
        const middleware = this.middleware[index++]!;
        return (await middleware(query, dispatch)) as R;
      }
      return (await handler(query)) as R;
    };

    return dispatch();
  }
}

export class EventBusError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EventBusError';
  }
}

/**
 * Integration event bus — fan-out to multiple handlers per event type.
 */
export class EventBus {
  private readonly handlers = new Map<string, EventHandler<IntegrationEvent>[]>();
  private readonly middleware: BusMiddleware<IntegrationEvent>[] = [];

  use(middleware: BusMiddleware<IntegrationEvent>): this {
    this.middleware.push(middleware);
    return this;
  }

  subscribe<E extends IntegrationEvent>(type: string, handler: EventHandler<E>): this {
    const list = this.handlers.get(type) ?? [];
    list.push(handler as EventHandler<IntegrationEvent>);
    this.handlers.set(type, list);
    return this;
  }

  async publish<E extends IntegrationEvent>(event: E): Promise<void> {
    const handlers = this.handlers.get(event.type) ?? [];
    if (handlers.length === 0) {
      return;
    }

    for (const handler of handlers) {
      let index = 0;
      const runHandler = async (): Promise<void> => {
        if (index < this.middleware.length) {
          const middleware = this.middleware[index++]!;
          await middleware(event, runHandler);
          return;
        }
        await handler(event);
      };
      await runHandler();
    }
  }
}
