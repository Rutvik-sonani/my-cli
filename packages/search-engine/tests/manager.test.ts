import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSystem } from '@mycli/filesystem';
import { createTemplateEngine } from '@mycli/template-engine';
import { afterEach, describe, expect, it } from 'vitest';
import { createSearchManager } from '../src/manager.js';

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('SearchManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('scaffolds meilisearch search platform', async () => {
    dir = await mkdtemp(join(tmpdir(), 'search-engine-'));
    const fs = createFileSystem(dir);
    const templatesRoot = join(import.meta.dirname, '../../../apps/cli/templates');
    const manager = createSearchManager({
      cwd: dir,
      filesystem: fs,
      templateEngine: createTemplateEngine({ filesystem: fs, templatesRoot }),
      templatesRoot,
    });

    const result = await manager.setup({
      appName: 'demo',
      provider: 'meilisearch',
      language: 'typescript',
    });

    expect(result.dependencies.meilisearch).toBeTruthy();
    expect(await pathExists(join(dir, 'src/search/search.service.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/search/adapter/meilisearch.adapter.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/search/adapter/memory.adapter.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/search/indexer/document-indexer.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/search/query/search-query.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'SEARCH.md'))).toBe(true);

    const register = await readFile(join(dir, 'src/search/register-search.ts'), 'utf8');
    expect(register).toContain('MeilisearchSearchAdapter');
  });

  it('scaffolds algolia provider', async () => {
    dir = await mkdtemp(join(tmpdir(), 'search-algolia-'));
    const fs = createFileSystem(dir);
    const templatesRoot = join(import.meta.dirname, '../../../apps/cli/templates');
    const manager = createSearchManager({
      cwd: dir,
      filesystem: fs,
      templateEngine: createTemplateEngine({ filesystem: fs, templatesRoot }),
      templatesRoot,
    });

    const algolia = await manager.setup({
      appName: 'shop',
      provider: 'algolia',
      language: 'typescript',
    });
    expect(algolia.dependencies.algoliasearch).toBeTruthy();
    expect(await pathExists(join(dir, 'src/search/adapter/algolia.adapter.ts'))).toBe(true);
  });

  it('scaffolds elasticsearch provider', async () => {
    dir = await mkdtemp(join(tmpdir(), 'search-es-'));
    const fs = createFileSystem(dir);
    const templatesRoot = join(import.meta.dirname, '../../../apps/cli/templates');
    const manager = createSearchManager({
      cwd: dir,
      filesystem: fs,
      templateEngine: createTemplateEngine({ filesystem: fs, templatesRoot }),
      templatesRoot,
    });
    const elastic = await manager.setup({
      appName: 'shop',
      provider: 'elasticsearch',
      language: 'typescript',
    });
    expect(elastic.dependencies['@elastic/elasticsearch']).toBeTruthy();
    expect(await pathExists(join(dir, 'src/search/adapter/elasticsearch.adapter.ts'))).toBe(true);
  });
});
