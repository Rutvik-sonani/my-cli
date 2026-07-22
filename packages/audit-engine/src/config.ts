import { join } from 'node:path';
import type { AuditStorageBackend } from '@mycli-cli/enterprise-core';

export interface AuditPathConfig {
  audit?: string;
}

export interface AuditPaths {
  root: string;
  storage: string;
}

export function resolveAuditPaths(config: AuditPathConfig = {}): AuditPaths {
  const root = config.audit ?? 'src/audit';

  return {
    root,
    storage: join(root, 'storage'),
  };
}

export const AUDIT_STORAGE_BACKENDS: AuditStorageBackend[] = ['memory', 'file'];

export function normalizeAuditStorage(input: string): AuditStorageBackend | null {
  const value = input.toLowerCase().replace(/_/g, '-');
  return AUDIT_STORAGE_BACKENDS.includes(value as AuditStorageBackend)
    ? (value as AuditStorageBackend)
    : null;
}

export function getAuditEnvLines(appName: string, storage: AuditStorageBackend): string[] {
  const lines = [`AUDIT_APP=${appName}`, `AUDIT_STORAGE=${storage}`, 'AUDIT_ENABLED=true'];
  if (storage === 'file') {
    lines.push('AUDIT_FILE_PATH=./data/audit.log.jsonl');
  }
  return lines;
}

export function storageTemplateFile(storage: AuditStorageBackend): string {
  return storage === 'file'
    ? 'features/audit/storage/file-audit.storage.ts.ejs'
    : 'features/audit/storage/memory-audit.storage.ts.ejs';
}

export function storageClassName(storage: AuditStorageBackend): string {
  return storage === 'file' ? 'FileAuditStorage' : 'MemoryAuditStorage';
}
