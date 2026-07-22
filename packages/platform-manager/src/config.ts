import type {
  PlatformFeature,
  PlatformSetupOptions,
  SearchProvider,
  TenancyMode,
} from './types.js';

export interface PlatformTemplateData {
  appName: string;
  feature: PlatformFeature;
  provider: string;
  tenancyMode: TenancyMode;
}

const FEATURE_FILES: Record<
  PlatformFeature,
  Array<{ template: string; out: (base: string) => string; root?: boolean; mode?: TenancyMode }>
> = {
  observability: [
    { template: 'features/platform/observability/logger.ts.ejs', out: (b) => `${b}/logger.ts` },
    {
      template: 'features/platform/observability/telemetry.ts.ejs',
      out: (b) => `${b}/telemetry.ts`,
    },
    {
      template: 'features/platform/observability/metrics.plugin.ts.ejs',
      out: (b) => `${b}/metrics.plugin.ts`,
    },
    { template: 'features/platform/observability/index.ts.ejs', out: (b) => `${b}/index.ts` },
  ],
  security: [
    {
      template: 'features/platform/security/security.plugin.ts.ejs',
      out: (b) => `${b}/security.plugin.ts`,
    },
    { template: 'features/platform/security/index.ts.ejs', out: (b) => `${b}/index.ts` },
  ],
  tenancy: [
    {
      template: 'features/platform/tenancy/tenant.context.ts.ejs',
      out: (b) => `${b}/tenant.context.ts`,
    },
    {
      template: 'features/platform/tenancy/tenant.middleware.single-db.ts.ejs',
      out: (b) => `${b}/tenant.middleware.ts`,
      mode: 'single-db' as TenancyMode,
    },
    {
      template: 'features/platform/tenancy/tenant.middleware.schema-per-tenant.ts.ejs',
      out: (b) => `${b}/tenant.middleware.ts`,
      mode: 'schema-per-tenant' as TenancyMode,
    },
    {
      template: 'features/platform/tenancy/tenant.middleware.db-per-tenant.ts.ejs',
      out: (b) => `${b}/tenant.middleware.ts`,
      mode: 'db-per-tenant' as TenancyMode,
    },
    {
      template: 'features/platform/tenancy/tenant.resolver.schema.ts.ejs',
      out: (b) => `${b}/tenant.resolver.ts`,
      mode: 'schema-per-tenant' as TenancyMode,
    },
    {
      template: 'features/platform/tenancy/tenant.resolver.db.ts.ejs',
      out: (b) => `${b}/tenant.resolver.ts`,
      mode: 'db-per-tenant' as TenancyMode,
    },
    { template: 'features/platform/tenancy/index.ts.ejs', out: (b) => `${b}/index.ts` },
  ],
  'feature-flags': [
    {
      template: 'features/platform/feature-flags/feature-flag.service.ts.ejs',
      out: (b) => `${b}/feature-flag.service.ts`,
    },
    { template: 'features/platform/feature-flags/index.ts.ejs', out: (b) => `${b}/index.ts` },
    {
      template: 'features/platform/feature-flags/flags.json.ejs',
      out: () => 'config/feature-flags.json',
      root: true,
    },
  ],
  search: [
    {
      template: 'features/platform/search/search.service.ts.ejs',
      out: (b) => `${b}/search.service.ts`,
    },
    { template: 'features/platform/search/index.ts.ejs', out: (b) => `${b}/index.ts` },
  ],
};

const DOC_TEMPLATES: Record<PlatformFeature, { template: string; out: string }> = {
  observability: {
    template: 'features/platform/observability/OBSERVABILITY.md.ejs',
    out: 'docs/observability.md',
  },
  security: { template: 'features/platform/security/SECURITY.md.ejs', out: 'docs/security.md' },
  tenancy: { template: 'features/platform/tenancy/TENANCY.md.ejs', out: 'docs/tenancy.md' },
  'feature-flags': {
    template: 'features/platform/feature-flags/FEATURE_FLAGS.md.ejs',
    out: 'docs/feature-flags.md',
  },
  search: { template: 'features/platform/search/SEARCH.md.ejs', out: 'docs/search.md' },
};

const ENV_LINES: {
  observability: () => string[];
  security: () => string[];
  tenancy: (mode: TenancyMode) => string[];
  'feature-flags': () => string[];
  search: (provider: string) => string[];
} = {
  observability: () => [
    'LOG_LEVEL=info',
    'OTEL_SERVICE_NAME=<%= appName %>',
    'OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318',
  ],
  security: () => [
    'CORS_ORIGIN=http://localhost:3000',
    'RATE_LIMIT_MAX=100',
    'RATE_LIMIT_WINDOW=1 minute',
  ],
  tenancy: (mode) =>
    mode === 'schema-per-tenant'
      ? ['TENANT_HEADER=x-tenant-id', 'DEFAULT_TENANT=default', 'TENANT_SCHEMA_PREFIX=tenant_']
      : mode === 'db-per-tenant'
        ? [
            'TENANT_HEADER=x-tenant-id',
            'DEFAULT_TENANT=default',
            'DATABASE_URL_<TENANT>=postgresql://...',
          ]
        : ['TENANT_HEADER=x-tenant-id', 'DEFAULT_TENANT=default'],
  'feature-flags': () => ['FEATURE_FLAGS_PATH=config/feature-flags.json'],
  search: (provider) =>
    provider === 'elasticsearch'
      ? [
          'SEARCH_PROVIDER=elasticsearch',
          'ELASTICSEARCH_URL=http://localhost:9200',
          'SEARCH_INDEX=<%= appName %>',
        ]
      : [
          'SEARCH_PROVIDER=meilisearch',
          'MEILISEARCH_HOST=http://localhost:7700',
          'MEILISEARCH_API_KEY=',
          'SEARCH_INDEX=<%= appName %>',
        ],
};

const DEPENDENCIES: Record<PlatformFeature, Record<string, string>> = {
  observability: {
    pino: '^9.6.0',
    '@opentelemetry/sdk-node': '^0.57.1',
    '@opentelemetry/api': '^1.9.0',
    '@opentelemetry/auto-instrumentations-node': '^0.55.3',
  },
  security: {
    '@fastify/helmet': '^13.0.1',
    '@fastify/cors': '^10.0.2',
    '@fastify/rate-limit': '^10.2.1',
  },
  tenancy: {},
  'feature-flags': {},
  search: {},
};

export function normalizePlatformFeature(input: string): PlatformFeature | null {
  const map: Record<string, PlatformFeature> = {
    observability: 'observability',
    security: 'security',
    tenancy: 'tenancy',
    'feature-flags': 'feature-flags',
    featureflags: 'feature-flags',
    flags: 'feature-flags',
    search: 'search',
  };
  return map[input] ?? null;
}

export function resolveProvider(feature: PlatformFeature, provider?: string): string {
  if (feature === 'search') {
    return (provider ?? 'meilisearch') as SearchProvider;
  }
  return provider ?? 'default';
}

export function buildPlatformTemplateData(options: PlatformSetupOptions): PlatformTemplateData {
  const feature = options.feature;
  return {
    appName: options.appName,
    feature,
    provider: resolveProvider(feature, options.provider),
    tenancyMode: options.tenancyMode ?? 'single-db',
  };
}

export function getFeatureFiles(feature: PlatformFeature, tenancyMode: TenancyMode = 'single-db') {
  const files = FEATURE_FILES[feature];
  if (feature !== 'tenancy') {
    return files;
  }
  return files.filter((file) => !file.mode || file.mode === tenancyMode);
}

export function getDocTemplate(feature: PlatformFeature) {
  return DOC_TEMPLATES[feature];
}

export function getEnvLines(
  feature: PlatformFeature,
  provider: string,
  appName: string,
  tenancyMode: TenancyMode = 'single-db',
): string[] {
  const lines =
    feature === 'tenancy' ? ENV_LINES.tenancy(tenancyMode) : ENV_LINES[feature](provider);
  return lines.map((line) => line.replace(/<%= appName %>/g, appName));
}

export function getPlatformDependencies(
  feature: PlatformFeature,
  provider: string,
): {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
} {
  if (feature === 'search') {
    if (provider === 'elasticsearch') {
      return { dependencies: { '@elastic/elasticsearch': '^8.17.0' }, devDependencies: {} };
    }
    return { dependencies: { meilisearch: '^0.49.0' }, devDependencies: {} };
  }

  if (feature === 'observability') {
    return {
      dependencies: DEPENDENCIES.observability,
      devDependencies: { 'pino-pretty': '^13.0.0' },
    };
  }

  return { dependencies: DEPENDENCIES[feature], devDependencies: {} };
}

export function featureFolderName(feature: PlatformFeature): string {
  return feature;
}
