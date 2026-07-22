import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createRegistryManager } from '../src/index.js';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');

describe('RegistryManager', () => {
  const registry = createRegistryManager({ repoRoot: REPO_ROOT });

  it('loads catalog and searches by keyword', async () => {
    const result = await registry.search({ query: 'docker' });
    expect(result.total).toBeGreaterThan(0);
    expect(result.entries[0]?.name).toBe('@mycli/docker');
  });

  it('gets plugin by name', async () => {
    const entry = await registry.get('@mycli/auth');
    expect(entry?.slug).toBe('auth');
    expect(entry?.npmPackage).toBe('@mycli/plugin-auth');
  });

  it('validates compatibility', async () => {
    const entry = await registry.get('@mycli/rbac');
    expect(entry).toBeDefined();
    expect(registry.validateCompatibility(entry!, '1.0.0')).toBe(true);
  });

  it('resolves official plugin path', async () => {
    const entry = await registry.get('@mycli/swagger');
    const path = registry.resolvePluginPath(entry!);
    expect(path).toContain('plugins/official/swagger');
  });

  it('publishes entry to catalog with dry-run', async () => {
    const result = await registry.publish({
      entry: {
        name: '@mycli/test-plugin',
        slug: 'test-plugin',
        version: '0.1.0',
        description: 'Test',
        compatibility: '>=1.0.0',
      },
      dryRun: true,
    });
    expect(result.entry.name).toBe('@mycli/test-plugin');
  });
});
