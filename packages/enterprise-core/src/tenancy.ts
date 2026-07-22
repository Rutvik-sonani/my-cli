/**
 * Multi-tenancy contracts (Phase 5).
 */
export type TenantModel = 'single-tenant' | 'multi-tenant-saas';

export type TenancyStrategy = 'shared-db' | 'schema-per-tenant' | 'db-per-tenant';

export interface TenantRecord {
  id: string;
  slug: string;
  name: string;
  status: 'active' | 'suspended' | 'provisioning';
  createdAt: Date;
}

export interface TenantContextState {
  tenantId: string;
  slug?: string;
  schema?: string;
  databaseUrl?: string;
}
