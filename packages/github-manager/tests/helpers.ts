import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function featureTemplatesRoot(): string {
  return join(__dirname, '..', '..', '..', 'apps', 'cli', 'templates');
}
