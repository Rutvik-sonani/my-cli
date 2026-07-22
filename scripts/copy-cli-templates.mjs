import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'apps/cli/templates');
const dest = join(root, 'apps/cli/dist/templates');

if (!existsSync(src)) {
  console.warn('No CLI templates to copy');
  process.exit(0);
}

mkdirSync(dirname(dest), { recursive: true });
cpSync(src, dest, { recursive: true });
console.log('Copied CLI templates to dist/templates');

const localesSrc = join(root, 'locales');
const localesDest = join(root, 'apps/cli/dist/locales');
if (existsSync(localesSrc)) {
  mkdirSync(dirname(localesDest), { recursive: true });
  cpSync(localesSrc, localesDest, { recursive: true });
  console.log('Copied locales to dist/locales');
}
