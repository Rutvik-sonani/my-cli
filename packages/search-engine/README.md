# @mycli/search-engine

Enterprise search platform for MyCLI (Phase 13).

## CLI

```bash
my add search
my add search --provider meilisearch
my add search --provider elasticsearch
my add search --provider algolia
```

## Providers

- **meilisearch** (default)
- **elasticsearch**
- **algolia**

## Generated layout

```
src/search/
  adapter/
  indexer/
  query/
tests/search/
SEARCH.md
```
