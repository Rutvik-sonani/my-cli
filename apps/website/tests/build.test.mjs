import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const websiteRoot = join(__dirname, '..');
const distDir = join(websiteRoot, 'dist');

describe('website build', () => {
  beforeAll(() => {
    execSync('node ./scripts/build.mjs', { cwd: websiteRoot, stdio: 'pipe' });
  });

  it('generates home and docs index', () => {
    expect(existsSync(join(distDir, 'index.html'))).toBe(true);
    expect(existsSync(join(distDir, 'docs/index.html'))).toBe(true);
    const home = readFileSync(join(distDir, 'index.html'), 'utf8');
    expect(home).toContain('MyCLI');
    expect(home).toContain('docs/getting-started.html');
  });

  it('renders getting-started from repository markdown', () => {
    const page = readFileSync(join(distDir, 'docs/getting-started.html'), 'utf8');
    expect(page).toContain('Getting started');
    expect(page).toContain('Node.js');
    expect(page).toContain('my create my-app');
  });

  it('renders publishing guide', () => {
    const page = readFileSync(join(distDir, 'docs/publishing.html'), 'utf8');
    expect(page).toContain('Changesets');
    expect(page).toContain('NPM_TOKEN');
  });
});
