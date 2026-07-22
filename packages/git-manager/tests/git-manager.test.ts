import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSystem } from '@mycli-cli/filesystem';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  type GithubGitAdapter,
  type GitlabGitAdapter,
  createGitManager,
  getGitProviderAdapter,
} from '../src/index.js';
import { featureTemplatesRoot } from './helpers.js';

describe('GitManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('initializes repository and writes gitignore', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-git-'));
    const git = createGitManager({ cwd: dir });

    expect(await git.isAvailable()).toBe(true);
    await git.init({ cwd: dir, defaultBranch: 'main' });
    expect(await git.isRepository(dir)).toBe(true);

    await git.generateIgnore(['react'], dir);
    const ignore = await readFile(join(dir, '.gitignore'), 'utf8');
    expect(ignore).toContain('node_modules/');
    expect(ignore).toContain('.next/');
  });

  it('plans publish flow with dry-run', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-git-pub-'));
    const git = createGitManager({ cwd: dir });

    const result = await git.publishToRemote({
      provider: 'github',
      name: 'shop-app',
      cwd: dir,
      dryRun: true,
    });

    expect(result.executed).toBe(false);
    expect(result.commands.some((c) => c.includes('git init'))).toBe(true);
    expect(result.commands.some((c) => c.includes('gh repo create'))).toBe(true);
    expect(result.branch).toBe('main');
  });

  it('generates community files and git hooks', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-git-community-'));
    const git = createGitManager({ cwd: dir });

    const community = await git.generateCommunityFiles({
      cwd: dir,
      appName: 'shop-app',
      templatesRoot: featureTemplatesRoot(),
    });
    expect(community).toContain('LICENSE');
    expect(community).toContain('CHANGELOG.md');
    expect(community).toContain('CONTRIBUTING.md');
    expect(community).toContain('CODE_OF_CONDUCT.md');
    expect(community).toContain('SECURITY.md');

    const license = await readFile(join(dir, 'LICENSE'), 'utf8');
    expect(license).toContain('MIT');

    const hooks = await git.setupHooks({
      cwd: dir,
      appName: 'shop-app',
      templatesRoot: featureTemplatesRoot(),
      convention: 'conventional',
      packageManager: 'pnpm',
    });
    expect(hooks.files).toContain('.husky/pre-commit');
    expect(hooks.devDependencies.husky).toBeDefined();
    const preCommit = await readFile(join(dir, '.husky/pre-commit'), 'utf8');
    expect(preCommit).toContain('lint-staged');
  });

  it('generates commitizen config and commit script with hooks', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-git-cz-'));
    const git = createGitManager({ cwd: dir });

    const hooks = await git.setupHooks({
      cwd: dir,
      appName: 'shop-app',
      templatesRoot: featureTemplatesRoot(),
      convention: 'conventional',
      packageManager: 'pnpm',
    });
    expect(hooks.files).toContain('.cz-config.js');
    expect(hooks.scripts.commit).toBe('cz');
    expect(hooks.devDependencies.commitizen).toBeDefined();
  });

  it('creates develop branch for git-flow strategy', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-git-flow-'));
    const fs = createFileSystem(dir);
    await fs.write('README.md', '# test\n');
    const git = createGitManager({ cwd: dir });
    await git.init({ cwd: dir, defaultBranch: 'main' });
    await git.addAll(dir);
    await git.commit('Initial commit', dir);
    await git.setupBranchStrategy('git-flow', dir);

    const { execa } = await import('execa');
    const branches = await execa('git', ['branch', '--list'], { cwd: dir });
    expect(branches.stdout).toContain('develop');
    expect(branches.stdout).toContain('main');
  });

  it('creates initial commit during publish when repo is empty', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-git-commit-'));
    const fs = createFileSystem(dir);
    await fs.write('README.md', '# test\n');

    const git = createGitManager({ cwd: dir });
    await git.init({ cwd: dir });
    await git.generateIgnore([], dir);
    await git.addAll(dir);

    const remote = await git.createRemoteRepo({
      provider: 'bitbucket',
      name: 'demo',
      cwd: dir,
      dryRun: true,
    });

    expect(remote.commands.length).toBeGreaterThan(0);
    expect(await git.hasCommits(dir)).toBe(false);

    await git.commit('Initial commit', dir);
    expect(await git.hasCommits(dir)).toBe(true);
  });
});

describe('Git provider adapters', () => {
  let adapterDir: string;

  afterEach(async () => {
    if (adapterDir) await rm(adapterDir, { recursive: true, force: true });
  });

  it('plans GitHub repo create commands', () => {
    const adapter = getGitProviderAdapter('github') as GithubGitAdapter;
    const plan = adapter.planCreate({ provider: 'github', name: 'my-app', private: true });

    expect(plan.commands[0]).toContain('gh repo create');
    expect(plan.commands[0]).toContain('--private');
    expect(plan.url).toBe('https://github.com/my-app.git');
  });

  it('plans GitLab repo create commands', () => {
    const adapter = getGitProviderAdapter('gitlab') as GitlabGitAdapter;
    const plan = adapter.planCreate({ provider: 'gitlab', name: 'my-app', branch: 'main' });

    expect(plan.commands[0]).toContain('glab repo create');
    expect(plan.url).toContain('gitlab.com');
  });

  it('returns manual steps for Bitbucket without credentials', async () => {
    const adapter = getGitProviderAdapter('bitbucket');
    expect(adapter).toBeDefined();
    const plan = adapter?.planCreate({ provider: 'bitbucket', name: 'demo', owner: 'acme' });
    expect(plan.commands.some((c) => c.includes('api.bitbucket.org'))).toBe(true);
    expect(plan.url).toContain('bitbucket.org/acme/demo');
  });

  it('creates Bitbucket repo via REST API when token is set', async () => {
    const adapter = getGitProviderAdapter('bitbucket')!;
    const previousToken = process.env.BITBUCKET_TOKEN;
    process.env.BITBUCKET_TOKEN = 'test-token';

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          links: {
            clone: [{ name: 'https', href: 'https://bitbucket.org/acme/demo.git' }],
          },
        }),
        { status: 200 },
      ),
    );

    adapterDir = await mkdtemp(join(tmpdir(), 'mycli-bitbucket-api-'));
    const fs = createFileSystem(adapterDir);
    await fs.write('README.md', '# demo\n');
    const git = createGitManager({ cwd: adapterDir });
    await git.init({ cwd: adapterDir });

    const result = await adapter.executeCreate({
      provider: 'bitbucket',
      name: 'demo',
      owner: 'acme',
      cwd: adapterDir,
    });

    expect(result.executed).toBe(true);
    expect(result.url).toBe('https://bitbucket.org/acme/demo.git');
    expect(fetchMock).toHaveBeenCalled();

    fetchMock.mockRestore();
    if (previousToken === undefined) {
      process.env.BITBUCKET_TOKEN = undefined;
    } else {
      process.env.BITBUCKET_TOKEN = previousToken;
    }
  });

  it('plans Azure DevOps repo create with org and project', () => {
    const adapter = getGitProviderAdapter('azure-devops')!;
    const plan = adapter.planCreate({
      provider: 'azure-devops',
      name: 'demo',
      organization: 'contoso',
      project: 'platform',
    });

    expect(plan.commands[0]).toContain('az repos create');
    expect(plan.commands[0]).toContain('--project platform');
    expect(plan.commands[0]).toContain('https://dev.azure.com/contoso');
  });
});
