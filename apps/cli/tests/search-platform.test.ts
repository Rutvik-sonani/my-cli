import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createCli } from '../src/cli.js';

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('my add search (Phase 13)', () => {
  let dir: string;
  let previousCwd: string;

  beforeEach(() => {
    previousCwd = process.cwd();
  });

  afterEach(async () => {
    process.chdir(previousCwd);
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  async function scaffoldProject() {
    dir = await mkdtemp(join(tmpdir(), 'mycli-search-'));
    process.chdir(dir);
    await writeFile(
      join(dir, '.myclirc.json'),
      JSON.stringify({
        version: '1.0.0',
        projectName: 'demo',
        language: 'typescript',
        paths: { search: 'src/search' },
      }),
    );
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'demo', version: '1.0.0', type: 'module' }),
    );
  }

  it('adds meilisearch search platform with indexer and query', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run(['add', 'search', '--provider', 'meilisearch']);
    expect(result.exitCode).toBe(0);

    expect(await pathExists(join(dir, 'src/search/search-provider.interface.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/search/adapter/meilisearch.adapter.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/search/adapter/memory.adapter.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/search/indexer/document-indexer.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/search/query/search-query.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'SEARCH.md'))).toBe(true);

    const config = JSON.parse(await readFile(join(dir, '.myclirc.json'), 'utf8'));
    expect(config.features.search).toBe(true);
    expect(config.extensions.searchProvider).toBe('meilisearch');

    const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
    expect(pkg.dependencies.meilisearch).toBeTruthy();

    await cli.shutdown();
  });

  it('adds elasticsearch and algolia providers', async () => {
    await scaffoldProject();
    const cli = await createCli();

    const es = await cli.run(['add', 'search', '--provider', 'elasticsearch']);
    expect(es.exitCode).toBe(0);
    expect(await pathExists(join(dir, 'src/search/adapter/elasticsearch.adapter.ts'))).toBe(true);
    let pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
    expect(pkg.dependencies['@elastic/elasticsearch']).toBeTruthy();

    await rm(join(dir, 'src'), { recursive: true, force: true });
    const algolia = await cli.run(['add', 'search', '--provider', 'algolia']);
    expect(algolia.exitCode).toBe(0);
    expect(await pathExists(join(dir, 'src/search/adapter/algolia.adapter.ts'))).toBe(true);
    pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
    expect(pkg.dependencies.algoliasearch).toBeTruthy();

    await cli.shutdown();
  });
});
