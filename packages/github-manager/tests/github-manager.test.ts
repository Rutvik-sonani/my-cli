import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSystem } from '@mycli-cli/filesystem';
import { afterEach, describe, expect, it } from 'vitest';
import { createGithubManager } from '../src/index.js';
import { featureTemplatesRoot } from './helpers.js';

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('GithubManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('generates GitHub community files and CI workflow', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-github-'));
    const fs = createFileSystem(dir);
    const github = createGithubManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    const result = await github.setup({ appName: 'shop', packageManager: 'pnpm' });

    expect(result.files).toContain('.github/workflows/ci.yml');
    expect(result.files).toContain('.github/dependabot.yml');
    expect(result.files).toContain('.github/ISSUE_TEMPLATE/bug.yml');
    expect(result.files).toContain('.github/ISSUE_TEMPLATE/feature.yml');
    expect(result.files).toContain('SECURITY.md');
    expect(result.files).toContain('GITHUB.md');

    const ci = await readFile(join(dir, '.github/workflows/ci.yml'), 'utf8');
    expect(ci).toContain('name: CI');
    expect(ci).toContain('pnpm install --frozen-lockfile');
    expect(ci).toContain('pnpm run lint');

    const security = await readFile(join(dir, 'SECURITY.md'), 'utf8');
    expect(security).toContain('shop');
  });

  it('includes release workflow when requested', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-github-rel-'));
    const fs = createFileSystem(dir);
    const github = createGithubManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    const result = await github.setup({
      appName: 'shop',
      includeReleaseWorkflow: true,
    });

    expect(result.files).toContain('.github/workflows/release.yml');
    const release = await readFile(join(dir, '.github/workflows/release.yml'), 'utf8');
    expect(release).toContain('changesets/action');
  });

  it('supports dry-run', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-github-dry-'));
    const fs = createFileSystem(dir);
    const github = createGithubManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    await github.setup({ appName: 'dry', dryRun: true });
    expect(await fileExists(join(dir, '.github/workflows/ci.yml'))).toBe(false);
  });

  it('includes deploy workflow and renovate when requested', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-github-deploy-'));
    const fs = createFileSystem(dir);
    const github = createGithubManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    const result = await github.setup({
      appName: 'shop',
      includeDeployWorkflow: true,
      includeRenovate: true,
    });

    expect(result.files).toContain('.github/workflows/deploy.yml');
    expect(result.files).toContain('renovate.json');

    const deploy = await readFile(join(dir, '.github/workflows/deploy.yml'), 'utf8');
    expect(deploy).toContain('name: Deploy');

    const renovate = await readFile(join(dir, 'renovate.json'), 'utf8');
    expect(renovate).toContain('config:recommended');
  });

  it('plans GitHub label creation commands', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-github-labels-'));
    const fs = createFileSystem(dir);
    const github = createGithubManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    const result = await github.createLabels({ cwd: dir, dryRun: true });
    expect(result.labels).toContain('bug');
    expect(result.labels).toContain('security');
    expect(result.commands.some((c) => c.includes('gh label create'))).toBe(true);
  });
});
