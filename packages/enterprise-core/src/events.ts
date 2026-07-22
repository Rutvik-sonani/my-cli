/**
 * Event-driven system contracts (Phase 4).
 */
export interface EventEnvelope<T = unknown> {
  readonly id: string;
  readonly type: string;
  readonly version: number;
  readonly payload: T;
  readonly occurredAt: Date;
  readonly metadata?: Record<string, string>;
}

export interface EventPublisher {
  publish<T>(envelope: EventEnvelope<T>): Promise<void>;
  close?(): Promise<void>;
}

export interface EventConsumer {
  subscribe(type: string, handler: EventConsumerHandler): Promise<void>;
  start?(): Promise<void>;
  stop?(): Promise<void>;
}

export type EventConsumerHandler<T = unknown> = (
  envelope: EventEnvelope<T>,
) => Promise<void> | void;

export interface EventSerializer {
  serialize<T>(envelope: EventEnvelope<T>): string;
  deserialize<T>(raw: string): EventEnvelope<T>;
}

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export type EventSystemProvider = 'kafka' | 'rabbitmq' | 'nats' | 'redis' | 'eventbridge';
