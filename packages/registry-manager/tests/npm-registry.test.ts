import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRegistryManager } from '../src/index.js';
import { NpmRegistryClient } from '../src/npm.js';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');

describe('NpmRegistryClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('searches npm registry for mycli packages', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          objects: [
            {
              package: {
                name: '@mycli/plugin-demo',
                version: '1.0.0',
                description: 'Demo plugin',
              },
            },
          ],
        }),
      })),
    );

    const client = new NpmRegistryClient();
    const results = await client.search('demo');
    expect(results[0]?.name).toBe('@mycli/plugin-demo');
  });

  it('merges npm results in registry search', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          objects: [
            {
              package: {
                name: '@mycli/plugin-extra',
                version: '2.0.0',
                description: 'Extra plugin',
              },
            },
          ],
        }),
      })),
    );

    const registry = createRegistryManager({ repoRoot: REPO_ROOT });

    const result = await registry.search({ query: 'extra', registry: 'all', limit: 10 });
    expect(result.entries.some((e) => e.npmPackage === '@mycli/plugin-extra')).toBe(true);
  });
});
