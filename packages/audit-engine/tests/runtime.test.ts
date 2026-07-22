import { describe, expect, it } from 'vitest';
import { normalizeAuditStorage } from '../src/config.js';
import {
  AuditService,
  InMemoryAuditStorage,
  computeStateDiff,
} from '../src/runtime/audit-service.js';

describe('AuditService', () => {
  it('records audit events with before/after state', async () => {
    const storage = new InMemoryAuditStorage();
    const service = new AuditService(storage);

    const record = await service.record(
      { userId: 'admin', ip: '10.0.0.1', device: 'chrome' },
      {
        action: 'role.update',
        resource: 'user:1',
        beforeState: { role: 'customer' },
        afterState: { role: 'admin' },
      },
    );

    expect(record.action).toBe('role.update');
    expect(storage.size()).toBe(1);

    const byResource = await service.listByResource('user:1');
    expect(byResource).toHaveLength(1);
  });

  it('computes diffs between states', () => {
    const diff = computeStateDiff(
      { role: 'customer', active: true },
      { role: 'admin', active: true },
    );
    expect(diff).toEqual({ role: { before: 'customer', after: 'admin' } });
  });
});

describe('audit config', () => {
  it('normalizes storage backends', () => {
    expect(normalizeAuditStorage('memory')).toBe('memory');
    expect(normalizeAuditStorage('file')).toBe('file');
    expect(normalizeAuditStorage('unknown')).toBeNull();
  });
});
