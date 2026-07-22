import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSystem } from '@mycli-cli/filesystem';
import { afterEach, describe, expect, it } from 'vitest';
import { createPlatformManager, normalizePlatformFeature } from '../src/index.js';
import { featureTemplatesRoot } from './helpers.js';

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('PlatformManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('normalizes feature aliases', () => {
    expect(normalizePlatformFeature('flags')).toBe('feature-flags');
    expect(normalizePlatformFeature('featureflags')).toBe('feature-flags');
  });

  it('generates observability and security modules', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-platform-'));
    const fs = createFileSystem(dir);
    const platform = createPlatformManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    const obs = await platform.setup({ feature: 'observability', appName: 'shop' });
    expect(obs.files).toContain('src/platform/observability/logger.ts');
    expect(obs.dependencies.pino).toBeTruthy();

    await platform.setup({ feature: 'security', appName: 'shop' });
    expect(await fileExists(join(dir, 'src/platform/security/security.plugin.ts'))).toBe(true);
  });

  it('generates tenancy, feature-flags, and search', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-platform-all-'));
    const fs = createFileSystem(dir);
    const platform = createPlatformManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    await platform.setup({ feature: 'tenancy', appName: 'shop' });
    await platform.setup({ feature: 'feature-flags', appName: 'shop' });
    const search = await platform.setup({
      feature: 'search',
      appName: 'shop',
      provider: 'meilisearch',
    });

    expect(await fileExists(join(dir, 'config/feature-flags.json'))).toBe(true);
    expect(search.dependencies.meilisearch).toBeTruthy();

    const flags = await readFile(join(dir, 'config/feature-flags.json'), 'utf8');
    expect(flags).toContain('beta-api');
  });

  it.each([
    [
      'single-db',
      { resolver: false, env: 'DEFAULT_TENANT=default', marker: 'Single-database tenancy' },
    ],
    [
      'schema-per-tenant',
      { resolver: true, env: 'TENANT_SCHEMA_PREFIX=tenant_', marker: 'Schema-per-tenant' },
    ],
    [
      'db-per-tenant',
      { resolver: true, env: 'DATABASE_URL_<TENANT>', marker: 'Database-per-tenant' },
    ],
  ] as const)('generates tenancy mode %s', async (mode, expected) => {
    dir = await mkdtemp(join(tmpdir(), `mycli-tenancy-${mode}-`));
    const fs = createFileSystem(dir);
    const platform = createPlatformManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    await platform.setup({ feature: 'tenancy', appName: 'shop', tenancyMode: mode });

    const middleware = await readFile(
      join(dir, 'src/platform/tenancy/tenant.middleware.ts'),
      'utf8',
    );
    expect(middleware).toContain(expected.marker);

    const resolverPath = join(dir, 'src/platform/tenancy/tenant.resolver.ts');
    expect(await fileExists(resolverPath)).toBe(expected.resolver);

    const docs = await readFile(join(dir, 'docs/tenancy.md'), 'utf8');
    expect(docs).toContain(mode);

    const env = await readFile(join(dir, '.env.example'), 'utf8');
    expect(env).toContain(expected.env);
  });

  it('supports dry-run', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-platform-dry-'));
    const fs = createFileSystem(dir);
    const platform = createPlatformManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    await platform.setup({ feature: 'observability', appName: 'dry', dryRun: true });
    expect(await fileExists(join(dir, 'src/platform/observability/logger.ts'))).toBe(false);
  });
});
