import { randomUUID } from 'node:crypto';
import type { EventEnvelope, EventSerializer } from '@mycli-cli/enterprise-core';

export interface SerializedEvent {
  id: string;
  type: string;
  version: number;
  payload: unknown;
  occurredAt: string;
  metadata?: Record<string, string>;
}

/**
 * JSON event serializer with explicit version field for schema evolution.
 */
export class JsonEventSerializer implements EventSerializer {
  serialize<T>(envelope: EventEnvelope<T>): string {
    const body: SerializedEvent = {
      id: envelope.id,
      type: envelope.type,
      version: envelope.version,
      payload: envelope.payload,
      occurredAt: envelope.occurredAt.toISOString(),
      metadata: envelope.metadata,
    };
    return JSON.stringify(body);
  }

  deserialize<T>(raw: string): EventEnvelope<T> {
    const parsed = JSON.parse(raw) as SerializedEvent;
    return {
      id: parsed.id,
      type: parsed.type,
      version: parsed.version,
      payload: parsed.payload as T,
      occurredAt: new Date(parsed.occurredAt),
      metadata: parsed.metadata,
    };
  }
}

export function createEventEnvelope<T>(
  type: string,
  payload: T,
  options: { version?: number; metadata?: Record<string, string> } = {},
): EventEnvelope<T> {
  return {
    id: randomUUID(),
    type,
    version: options.version ?? 1,
    payload,
    occurredAt: new Date(),
    metadata: options.metadata,
  };
}
