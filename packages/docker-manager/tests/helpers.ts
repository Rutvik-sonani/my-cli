import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Resolve bundled CLI feature templates for manager tests. */
export function featureTemplatesRoot(): string {
  return join(__dirname, '..', '..', '..', 'apps', 'cli', 'templates');
}
