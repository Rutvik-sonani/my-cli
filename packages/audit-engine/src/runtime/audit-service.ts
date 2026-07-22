import { randomUUID } from 'node:crypto';
import type { AuditContext, AuditRecord, AuditStorage } from '@mycli/enterprise-core';

export class InMemoryAuditStorage implements AuditStorage {
  private readonly records: AuditRecord[] = [];

  async save(record: AuditRecord): Promise<void> {
    this.records.push(record);
  }

  async findByResource(resource: string): Promise<AuditRecord[]> {
    return this.records.filter((record) => record.resource === resource);
  }

  async findByUser(userId: string): Promise<AuditRecord[]> {
    return this.records.filter((record) => record.userId === userId);
  }

  async list(limit = 100): Promise<AuditRecord[]> {
    return this.records.slice(-limit);
  }

  size(): number {
    return this.records.length;
  }
}

export interface AuditEventInput {
  action: string;
  resource: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}

/**
 * Records auditable actions with actor context and before/after snapshots.
 */
export class AuditService {
  constructor(private readonly storage: AuditStorage) {}

  async record(context: AuditContext, event: AuditEventInput): Promise<AuditRecord> {
    const record: AuditRecord = {
      id: randomUUID(),
      userId: context.userId,
      action: event.action,
      resource: event.resource,
      timestamp: new Date(),
      ip: context.ip,
      device: context.device ?? context.userAgent,
      beforeState: event.beforeState ?? null,
      afterState: event.afterState ?? null,
      metadata: event.metadata,
    };
    await this.storage.save(record);
    return record;
  }

  async listByResource(resource: string): Promise<AuditRecord[]> {
    return this.storage.findByResource(resource);
  }

  async listByUser(userId: string): Promise<AuditRecord[]> {
    return this.storage.findByUser(userId);
  }
}

export function computeStateDiff(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): Record<string, { before: unknown; after: unknown }> {
  const diff: Record<string, { before: unknown; after: unknown }> = {};
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  for (const key of keys) {
    const prev = before?.[key];
    const next = after?.[key];
    if (prev !== next) {
      diff[key] = { before: prev, after: next };
    }
  }
  return diff;
}
