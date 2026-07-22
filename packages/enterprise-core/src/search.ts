/**
 * Search engine platform contracts (Phase 13).
 */
export type SearchProviderId = 'elasticsearch' | 'meilisearch' | 'algolia';

export interface SearchDocument {
  id: string;
  [key: string]: unknown;
}

export interface SearchQueryOptions {
  limit?: number;
  offset?: number;
  filter?: Record<string, string | number | boolean>;
  attributesToRetrieve?: string[];
}

export interface SearchHit<T extends SearchDocument = SearchDocument> {
  document: T;
  score: number;
}

export interface SearchResult<T extends SearchDocument = SearchDocument> {
  query: string;
  hits: SearchHit<T>[];
  total: number;
  tookMs: number;
}

export interface SearchProvider {
  readonly id: SearchProviderId;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  index(documents: SearchDocument | SearchDocument[]): Promise<void>;
  delete(id: string): Promise<boolean>;
  search<T extends SearchDocument = SearchDocument>(
    query: string,
    options?: SearchQueryOptions,
  ): Promise<SearchResult<T>>;
}
