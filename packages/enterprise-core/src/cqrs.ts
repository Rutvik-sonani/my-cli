/**
 * CQRS contracts (Phase 3).
 */
export interface CommandMessage {
  readonly type: string;
}

export interface QueryMessage {
  readonly type: string;
}

export interface IntegrationEvent {
  readonly type: string;
  readonly occurredAt: Date;
}

export type CommandHandler<C extends CommandMessage = CommandMessage, R = unknown> = (
  command: C,
) => Promise<R> | R;

export type QueryHandler<Q extends QueryMessage = QueryMessage, R = unknown> = (
  query: Q,
) => Promise<R> | R;

export type EventHandler<E extends IntegrationEvent = IntegrationEvent> = (
  event: E,
) => Promise<void> | void;

export type BusMiddleware<T> = (message: T, next: () => Promise<unknown>) => Promise<unknown>;

export type HandlerMode = 'sync' | 'async';
