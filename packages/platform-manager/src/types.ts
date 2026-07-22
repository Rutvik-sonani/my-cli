export type TenancyMode = 'single-db' | 'schema-per-tenant' | 'db-per-tenant';

export type PlatformFeature = 'observability' | 'security' | 'tenancy' | 'feature-flags' | 'search';

export type SearchProvider = 'meilisearch' | 'elasticsearch';

export interface PlatformSetupOptions {
  feature: PlatformFeature;
  appName: string;
  cwd?: string;
  platformPath?: string;
  provider?: string;
  tenancyMode?: TenancyMode;
  dryRun?: boolean;
}

export interface PlatformSetupResult {
  files: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}
