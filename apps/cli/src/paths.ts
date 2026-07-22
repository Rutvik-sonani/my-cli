import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveFeatureTemplatesRoot } from '@mycli-cli/template-engine';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Resolve bundled templates directory for the CLI package.
 * Works from both src (dev) and dist (production).
 */
export function resolveTemplatesRoot(): string {
  return resolveFeatureTemplatesRoot(__dirname);
}

export function resolveRepoRoot(): string {
  const candidates = [join(__dirname, '..', '..', '..'), join(process.cwd())];
  for (const candidate of candidates) {
    if (existsSync(join(candidate, 'pnpm-workspace.yaml'))) {
      return candidate;
    }
  }
  // Walk up from cwd (supports running CLI from generated projects)
  let current = process.cwd();
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(current, 'pnpm-workspace.yaml'))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return join(__dirname, '..', '..', '..');
}

/**
 * Resolve bundled locales directory for the CLI package.
 */
export function resolveLocalesRoot(): string {
  const bundled = join(__dirname, 'locales');
  if (existsSync(bundled)) {
    return bundled;
  }
  const repo = join(__dirname, '..', '..', '..', 'locales');
  if (existsSync(repo)) {
    return repo;
  }
  return bundled;
}
