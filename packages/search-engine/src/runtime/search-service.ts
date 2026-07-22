import type {
  SearchDocument,
  SearchHit,
  SearchProvider,
  SearchProviderId,
  SearchQueryOptions,
  SearchResult,
} from '@mycli-cli/enterprise-core';

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);
}

function documentText(doc: SearchDocument): string {
  return Object.values(doc)
    .filter((value) => typeof value === 'string' || typeof value === 'number')
    .map(String)
    .join(' ');
}

function scoreDocument(doc: SearchDocument, terms: string[]): number {
  if (terms.length === 0) return 0;
  const haystack = tokenize(documentText(doc));
  let score = 0;
  for (const term of terms) {
    if (haystack.includes(term)) score += 1;
    if (String(doc.id).toLowerCase() === term) score += 2;
  }
  return score;
}

function matchesFilter(
  doc: SearchDocument,
  filter?: Record<string, string | number | boolean>,
): boolean {
  if (!filter) return true;
  for (const [key, expected] of Object.entries(filter)) {
    if (doc[key] !== expected) return false;
  }
  return true;
}

/**
 * In-memory search provider used for local development and tests.
 * Remote adapters (Meilisearch / Elasticsearch / Algolia) wrap the same interface.
 */
export class InMemorySearchProvider implements SearchProvider {
  readonly id: SearchProviderId;
  private readonly store = new Map<string, SearchDocument>();
  private connected = false;

  constructor(id: SearchProviderId = 'meilisearch') {
    this.id = id;
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  size(): number {
    return this.store.size;
  }

  async index(documents: SearchDocument | SearchDocument[]): Promise<void> {
    if (!this.connected) await this.connect();
    const list = Array.isArray(documents) ? documents : [documents];
    for (const doc of list) {
      this.store.set(doc.id, { ...doc });
    }
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  async search<T extends SearchDocument = SearchDocument>(
    query: string,
    options: SearchQueryOptions = {},
  ): Promise<SearchResult<T>> {
    if (!this.connected) await this.connect();
    const started = Date.now();
    const terms = tokenize(query);
    const hits: SearchHit<T>[] = [];

    for (const doc of this.store.values()) {
      if (!matchesFilter(doc, options.filter)) continue;
      const score = terms.length === 0 ? 1 : scoreDocument(doc, terms);
      if (score <= 0) continue;
      hits.push({ document: doc as T, score });
    }

    hits.sort((a, b) => b.score - a.score);
    const offset = options.offset ?? 0;
    const limit = options.limit ?? 20;
    const sliced = hits.slice(offset, offset + limit);

    return {
      query,
      hits: sliced,
      total: hits.length,
      tookMs: Date.now() - started,
    };
  }
}

export class SearchService {
  constructor(private readonly provider: SearchProvider) {}

  getProvider(): SearchProvider {
    return this.provider;
  }

  async index(documents: SearchDocument | SearchDocument[]): Promise<void> {
    await this.provider.index(documents);
  }

  async delete(id: string): Promise<boolean> {
    return this.provider.delete(id);
  }

  async search<T extends SearchDocument = SearchDocument>(
    query: string,
    options?: SearchQueryOptions,
  ): Promise<SearchResult<T>> {
    return this.provider.search<T>(query, options);
  }
}

export class DocumentIndexer {
  constructor(private readonly service: SearchService) {}

  async indexOne(document: SearchDocument): Promise<void> {
    await this.service.index(document);
  }

  async indexMany(documents: SearchDocument[]): Promise<void> {
    await this.service.index(documents);
  }

  async reindex(documents: SearchDocument[]): Promise<void> {
    for (const doc of documents) {
      await this.service.delete(doc.id);
    }
    await this.service.index(documents);
  }
}

export function createSearchProvider(id: SearchProviderId): SearchProvider {
  return new InMemorySearchProvider(id);
}

export function createSearchService(provider?: SearchProvider): SearchService {
  return new SearchService(provider ?? new InMemorySearchProvider());
}
