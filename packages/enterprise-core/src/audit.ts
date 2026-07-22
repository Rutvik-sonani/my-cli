/**
 * Audit platform contracts (Phase 7).
 */
export interface AuditRecord {
  id: string;
  userId: string;
  action: string;
  resource: string;
  timestamp: Date;
  ip?: string;
  device?: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}

export interface AuditContext {
  userId: string;
  ip?: string;
  device?: string;
  userAgent?: string;
}

export interface AuditStorage {
  save(record: AuditRecord): Promise<void>;
  findByResource(resource: string): Promise<AuditRecord[]>;
  findByUser(userId: string): Promise<AuditRecord[]>;
  list(limit?: number): Promise<AuditRecord[]>;
}

export type AuditStorageBackend = 'memory' | 'file';
