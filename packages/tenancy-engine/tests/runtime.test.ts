import { describe, expect, it } from 'vitest';
import { normalizeTenancyStrategy, normalizeTenantModel } from '../src/config.js';
import {
  applyTenantFilter,
  resolveTenantDatabaseUrl,
  resolveTenantSchema,
  withTenantId,
} from '../src/runtime/resolvers.js';

describe('tenancy resolvers', () => {
  it('resolves safe schema names', () => {
    expect(resolveTenantSchema('acme-corp')).toBe('tenant_acme_corp');
  });

  it('filters shared-db records by tenant_id', () => {
    const rows = applyTenantFilter(
      [
        { id: '1', tenantId: 'a' },
        { id: '2', tenantId: 'b' },
      ],
      'a',
    );
    expect(rows).toHaveLength(1);
  });

  it('adds tenant_id to payloads', () => {
    expect(withTenantId({ name: 'x' }, 'tenant-1')).toEqual({ name: 'x', tenantId: 'tenant-1' });
  });

  it('reads tenant database url from env pattern', () => {
    process.env.DATABASE_URL_ACME = 'postgresql://acme';
    expect(resolveTenantDatabaseUrl('acme')).toBe('postgresql://acme');
    process.env.DATABASE_URL_ACME = undefined;
  });
});

describe('tenancy config', () => {
  it('normalizes tenant model aliases', () => {
    expect(normalizeTenantModel('saas')).toBe('multi-tenant-saas');
    expect(normalizeTenantModel('single')).toBe('single-tenant');
  });

  it('normalizes strategy aliases', () => {
    expect(normalizeTenancyStrategy('single-db')).toBe('shared-db');
    expect(normalizeTenancyStrategy('schema')).toBe('schema-per-tenant');
  });
});
