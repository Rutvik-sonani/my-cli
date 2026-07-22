import { join } from 'node:path';
import type { TenancyStrategy, TenantModel } from '@mycli-cli/enterprise-core';

export interface TenancyPathConfig {
  tenancy?: string;
}

export interface TenancyPaths {
  root: string;
  entities: string;
  repositories: string;
  schema: string;
  database: string;
}

export function resolveTenancyPaths(config: TenancyPathConfig = {}): TenancyPaths {
  const root = config.tenancy ?? 'src/tenancy';

  return {
    root,
    entities: join(root, 'entities'),
    repositories: join(root, 'repositories'),
    schema: join(root, 'schema'),
    database: join(root, 'database'),
  };
}

export const TENANT_MODELS: TenantModel[] = ['single-tenant', 'multi-tenant-saas'];
export const TENANCY_STRATEGIES: TenancyStrategy[] = [
  'shared-db',
  'schema-per-tenant',
  'db-per-tenant',
];

export function normalizeTenantModel(input: string): TenantModel | null {
  const value = input.toLowerCase().replace(/_/g, '-');
  if (value === 'single' || value === 'single-tenant') return 'single-tenant';
  if (
    value === 'multi' ||
    value === 'saas' ||
    value === 'multi-tenant' ||
    value === 'multi-tenant-saas'
  ) {
    return 'multi-tenant-saas';
  }
  return TENANT_MODELS.includes(value as TenantModel) ? (value as TenantModel) : null;
}

export function normalizeTenancyStrategy(input: string): TenancyStrategy | null {
  const value = input.toLowerCase().replace(/_/g, '-');
  if (value === 'single-db' || value === 'shared' || value === 'shared-db') return 'shared-db';
  if (value === 'schema' || value === 'schema-per-tenant') return 'schema-per-tenant';
  if (value === 'db' || value === 'database' || value === 'db-per-tenant') return 'db-per-tenant';
  return TENANCY_STRATEGIES.includes(value as TenancyStrategy) ? (value as TenancyStrategy) : null;
}

export function getTenancyEnvLines(
  model: TenantModel,
  strategy: TenancyStrategy,
  appName: string,
): string[] {
  const common = [
    'TENANT_HEADER=x-tenant-id',
    `TENANT_MODEL=${model}`,
    `TENANCY_STRATEGY=${strategy}`,
  ];
  if (model === 'single-tenant') {
    return [...common, `DEFAULT_TENANT=${appName}`, `TENANT_SLUG=${appName}`];
  }
  switch (strategy) {
    case 'schema-per-tenant':
      return [...common, 'DEFAULT_TENANT=default', 'TENANT_SCHEMA_PREFIX=tenant_'];
    case 'db-per-tenant':
      return [...common, 'DEFAULT_TENANT=default', 'DATABASE_URL_<TENANT_SLUG>=postgresql://...'];
    default:
      return [...common, 'DEFAULT_TENANT=default'];
  }
}
