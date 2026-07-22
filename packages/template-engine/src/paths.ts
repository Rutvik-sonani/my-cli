import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Resolve bundled feature templates (auth, rbac, database, api-docs, testing).
 * Works from CLI dist, monorepo dev, and manager package tests.
 */
export function resolveFeatureTemplatesRoot(startDir?: string): string {
  const here = startDir ?? dirname(fileURLToPath(import.meta.url));

  const candidates = [
    process.env.MYCLI_TEMPLATES_ROOT,
    join(here, 'templates'),
    join(here, '..', 'templates'),
    join(here, '..', '..', 'apps', 'cli', 'templates'),
    join(here, '..', '..', '..', 'apps', 'cli', 'templates'),
    join(process.cwd(), 'apps', 'cli', 'templates'),
    join(process.cwd(), 'templates'),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const features = join(candidate, 'features', 'auth');
    if (existsSync(features)) {
      return candidate;
    }
  }

  return join(process.cwd(), 'apps', 'cli', 'templates');
}
