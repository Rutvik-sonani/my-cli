import type { TenancyStrategy } from '@mycli/enterprise-core';

/** Map tenant id to a safe PostgreSQL schema name. */
export function resolveTenantSchema(
  tenantId: string,
  prefix = process.env.TENANT_SCHEMA_PREFIX ?? 'tenant_',
): string {
  return `${prefix}${tenantId.replace(/[^a-zA-Z0-9_]/g, '_')}`;
}

/** Resolve dedicated database URL for db-per-tenant strategy. */
export function resolveTenantDatabaseUrl(tenantSlug: string): string | undefined {
  const key = `DATABASE_URL_${tenantSlug.toUpperCase().replace(/[^A-Z0-9_]/g, '_')}`;
  return process.env[key];
}

/** Apply tenant_id filter for shared-database row-level isolation. */
export function applyTenantFilter<T extends { tenantId?: string }>(
  records: T[],
  tenantId: string,
): T[] {
  return records.filter((record) => record.tenantId === tenantId);
}

/** Build a tenant_id column value for new rows in shared-db mode. */
export function withTenantId<T extends Record<string, unknown>>(
  payload: T,
  tenantId: string,
): T & { tenantId: string } {
  return { ...payload, tenantId };
}

export function strategyRequiresResolver(strategy: TenancyStrategy): boolean {
  return strategy === 'schema-per-tenant' || strategy === 'db-per-tenant';
}
