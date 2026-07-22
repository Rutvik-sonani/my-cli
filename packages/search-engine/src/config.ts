import { join } from 'node:path';
import type { SearchProviderId } from '@mycli/enterprise-core';

export interface SearchPathConfig {
  search?: string;
}

export interface SearchPaths {
  root: string;
  adapter: string;
  indexer: string;
  query: string;
}

export function resolveSearchPaths(config: SearchPathConfig = {}): SearchPaths {
  const root = config.search ?? 'src/search';

  return {
    root,
    adapter: join(root, 'adapter'),
    indexer: join(root, 'indexer'),
    query: join(root, 'query'),
  };
}

export const SEARCH_PROVIDERS: SearchProviderId[] = ['meilisearch', 'elasticsearch', 'algolia'];

export function normalizeSearchProvider(input: string): SearchProviderId | null {
  const value = input.toLowerCase().replace(/_/g, '-');
  if (value === 'elastic' || value === 'es' || value === 'elasticsearch') return 'elasticsearch';
  if (value === 'meili' || value === 'meilisearch') return 'meilisearch';
  if (value === 'algolia') return 'algolia';
  return SEARCH_PROVIDERS.includes(value as SearchProviderId) ? (value as SearchProviderId) : null;
}

export function getSearchEnvLines(appName: string, provider: SearchProviderId): string[] {
  const lines = [`SEARCH_APP=${appName}`, `SEARCH_PROVIDER=${provider}`, `SEARCH_INDEX=${appName}`];
  switch (provider) {
    case 'elasticsearch':
      lines.push('ELASTICSEARCH_URL=http://localhost:9200');
      break;
    case 'meilisearch':
      lines.push('MEILISEARCH_HOST=http://localhost:7700');
      lines.push('MEILISEARCH_API_KEY=');
      break;
    case 'algolia':
      lines.push('ALGOLIA_APP_ID=');
      lines.push('ALGOLIA_API_KEY=');
      lines.push(`ALGOLIA_INDEX=${appName}`);
      break;
  }
  return lines;
}

export function getSearchDependencies(provider: SearchProviderId): {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
} {
  switch (provider) {
    case 'elasticsearch':
      return {
        dependencies: { '@elastic/elasticsearch': '^8.17.0' },
        devDependencies: {},
      };
    case 'algolia':
      return {
        dependencies: { algoliasearch: '^5.17.0' },
        devDependencies: {},
      };
    default:
      return {
        dependencies: { meilisearch: '^0.49.0' },
        devDependencies: {},
      };
  }
}

export function providerClassName(provider: SearchProviderId): string {
  switch (provider) {
    case 'elasticsearch':
      return 'ElasticsearchSearchAdapter';
    case 'algolia':
      return 'AlgoliaSearchAdapter';
    case 'meilisearch':
      return 'MeilisearchSearchAdapter';
  }
}

export function providerTemplateFile(provider: SearchProviderId): string {
  return `features/search/adapter/${provider}.adapter.ts.ejs`;
}
