import { describe, expect, it } from 'vitest';
import { DeadLetterQueue } from '../src/runtime/dead-letter.js';
import { InMemoryEventPublisher } from '../src/runtime/in-memory.js';
import { withRetry } from '../src/runtime/retry.js';
import { JsonEventSerializer, createEventEnvelope } from '../src/runtime/serializer.js';

describe('JsonEventSerializer', () => {
  it('round-trips versioned envelopes', () => {
    const serializer = new JsonEventSerializer();
    const envelope = createEventEnvelope('order.placed', { id: '1' }, { version: 2 });
    const parsed = serializer.deserialize(serializer.serialize(envelope));
    expect(parsed.version).toBe(2);
    expect(parsed.payload).toEqual({ id: '1' });
  });
});

describe('withRetry', () => {
  it('retries until success', async () => {
    let attempts = 0;
    const result = await withRetry(
      async () => {
        attempts += 1;
        if (attempts < 3) throw new Error('fail');
        return 'ok';
      },
      { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 2 },
    );
    expect(result).toBe('ok');
    expect(attempts).toBe(3);
  });
});

describe('DeadLetterQueue', () => {
  it('stores failed envelopes', () => {
    const dlq = new DeadLetterQueue();
    const envelope = createEventEnvelope('test', {});
    dlq.push(envelope, new Error('boom'));
    expect(dlq.size()).toBe(1);
  });
});

describe('InMemoryEventPublisher', () => {
  it('delivers events to subscribers with retry', async () => {
    const publisher = new InMemoryEventPublisher();
    const seen: string[] = [];
    publisher.subscribe('user.created', async (envelope) => {
      seen.push((envelope.payload as { id: string }).id);
    });

    await publisher.publish(createEventEnvelope('user.created', { id: 'abc' }));
    expect(seen).toEqual(['abc']);
  });

  it('routes failures to dead-letter queue', async () => {
    const publisher = new InMemoryEventPublisher();
    publisher.subscribe('user.created', async () => {
      throw new Error('handler failed');
    });

    await publisher.publish(createEventEnvelope('user.created', { id: 'x' }));
    expect(publisher.deadLetter.size()).toBe(1);
  });
});
