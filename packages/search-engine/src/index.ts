export {
  SEARCH_PROVIDERS,
  getSearchDependencies,
  getSearchEnvLines,
  normalizeSearchProvider,
  providerClassName,
  resolveSearchPaths,
  type SearchPathConfig,
  type SearchPaths,
} from './config.js';
export {
  SearchManager,
  createSearchManager,
  type SearchSetupOptions,
  type SearchSetupResult,
} from './manager.js';
export {
  DocumentIndexer,
  InMemorySearchProvider,
  SearchService,
  createSearchProvider,
  createSearchService,
} from './runtime/search-service.js';
export type { SearchProviderId } from '@mycli-cli/enterprise-core';
