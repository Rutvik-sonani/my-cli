import { describe, expect, it } from 'vitest';
import { normalizeSearchProvider } from '../src/config.js';
import {
  DocumentIndexer,
  InMemorySearchProvider,
  SearchService,
  createSearchProvider,
  createSearchService,
} from '../src/runtime/search-service.js';

describe('InMemorySearchProvider', () => {
  it('indexes and ranks search results', async () => {
    const provider = new InMemorySearchProvider('meilisearch');
    await provider.index([
      { id: '1', title: 'Red running shoes' },
      { id: '2', title: 'Blue jacket' },
    ]);

    const result = await provider.search('shoes');
    expect(result.total).toBe(1);
    expect(result.hits[0]?.document.id).toBe('1');
    expect(result.hits[0]?.score).toBeGreaterThan(0);
  });

  it('supports filters and deletes', async () => {
    const provider = createSearchProvider('elasticsearch');
    await provider.index([
      { id: 'a', title: 'Alpha', status: 'active' },
      { id: 'b', title: 'Beta', status: 'draft' },
    ]);
    const filtered = await provider.search('alpha', { filter: { status: 'active' } });
    expect(filtered.hits).toHaveLength(1);

    expect(await provider.delete('a')).toBe(true);
    const after = await provider.search('alpha');
    expect(after.total).toBe(0);
  });
});

describe('SearchService + DocumentIndexer', () => {
  it('reindexes documents through the service', async () => {
    const service = createSearchService();
    const indexer = new DocumentIndexer(service);
    await indexer.indexOne({ id: '1', title: 'First' });
    await indexer.reindex([{ id: '1', title: 'Updated shoes' }]);
    const result = await service.search('shoes');
    expect(result.hits[0]?.document.title).toBe('Updated shoes');
  });
});

describe('config', () => {
  it('normalizes search providers', () => {
    expect(normalizeSearchProvider('meili')).toBe('meilisearch');
    expect(normalizeSearchProvider('es')).toBe('elasticsearch');
    expect(normalizeSearchProvider('algolia')).toBe('algolia');
    expect(normalizeSearchProvider('solr')).toBeNull();
  });
});
