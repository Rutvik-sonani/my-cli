import type { EventConsumerHandler, EventEnvelope, EventPublisher } from '@mycli/enterprise-core';
import { DeadLetterQueue } from './dead-letter.js';
import { withRetry } from './retry.js';
import { JsonEventSerializer } from './serializer.js';

type HandlerMap = Map<string, EventConsumerHandler[]>;

/**
 * In-memory publisher/consumer for tests and local development.
 */
export class InMemoryEventPublisher implements EventPublisher {
  private readonly handlers: HandlerMap = new Map();
  readonly deadLetter = new DeadLetterQueue();
  readonly serializer = new JsonEventSerializer();

  async publish<T>(envelope: EventEnvelope<T>): Promise<void> {
    const handlers = this.handlers.get(envelope.type) ?? [];
    for (const handler of handlers) {
      try {
        await withRetry(async () => {
          await handler(envelope);
        });
      } catch (error) {
        this.deadLetter.push(envelope, error);
      }
    }
  }

  subscribe(type: string, handler: EventConsumerHandler): void {
    const list = this.handlers.get(type) ?? [];
    list.push(handler);
    this.handlers.set(type, list);
  }

  hasSubscriber(type: string): boolean {
    return (this.handlers.get(type)?.length ?? 0) > 0;
  }
}
