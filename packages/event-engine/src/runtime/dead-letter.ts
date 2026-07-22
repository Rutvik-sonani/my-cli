import type { EventEnvelope } from '@mycli-cli/enterprise-core';

export interface DeadLetterRecord {
  envelope: EventEnvelope;
  error: string;
  failedAt: Date;
  attempts: number;
}

/**
 * In-process dead-letter queue for failed event processing.
 */
export class DeadLetterQueue {
  private readonly records: DeadLetterRecord[] = [];

  push(envelope: EventEnvelope, error: unknown, attempts = 1): DeadLetterRecord {
    const record: DeadLetterRecord = {
      envelope,
      error: error instanceof Error ? error.message : String(error),
      failedAt: new Date(),
      attempts,
    };
    this.records.push(record);
    return record;
  }

  all(): readonly DeadLetterRecord[] {
    return this.records;
  }

  size(): number {
    return this.records.length;
  }

  clear(): void {
    this.records.length = 0;
  }
}
