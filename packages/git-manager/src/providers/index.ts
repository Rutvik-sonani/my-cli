import { MyCliError } from '@mycli-cli/core';
import { execa } from 'execa';
import type {
  CreateRemoteRepoOptions,
  CreateRemoteRepoResult,
  GitProvider,
  GitProviderAdapter,
} from '../types.js';
import { AzureDevOpsGitAdapter } from './azure-devops.js';
import { BitbucketGitAdapter } from './bitbucket.js';

async function cliAvailable(binary: string): Promise<boolean> {
  try {
    const result = await execa(binary, ['--version'], { reject: false });
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

function repoSlug(options: CreateRemoteRepoOptions): string {
  const owner = options.organization ?? options.owner;
  return owner ? `${owner}/${options.name}` : options.name;
}

export class GithubGitAdapter implements GitProviderAdapter {
  readonly provider = 'github' as const;
  readonly cliTools = ['gh'];

  async isAvailable(): Promise<boolean> {
    if (!(await cliAvailable('gh'))) return false;
    const auth = await execa('gh', ['auth', 'status'], { reject: false });
    return auth.exitCode === 0;
  }

  planCreate(options: CreateRemoteRepoOptions): CreateRemoteRepoResult {
    const visibility = options.private ? '--private' : '--public';
    const slug = repoSlug(options);
    const pushFlag = options.push !== false ? ' --push' : '';
    return {
      url: `https://github.com/${slug}.git`,
      remoteName: 'origin',
      commands: [`gh repo create ${slug} ${visibility} --source=. --remote=origin${pushFlag}`],
      executed: false,
      message: 'Requires GitHub CLI (gh) authenticated via gh auth login',
    };
  }

  async executeCreate(options: CreateRemoteRepoOptions): Promise<CreateRemoteRepoResult> {
    const plan = this.planCreate(options);
    if (options.dryRun) return plan;

    if (!(await this.isAvailable())) {
      throw new MyCliError(
        'GitHub CLI (gh) is not installed or not authenticated. Run: gh auth login',
        {
          code: 'GIT_ERROR',
        },
      );
    }

    const cwd = options.cwd ?? process.cwd();
    const visibility = options.private ? '--private' : '--public';
    const slug = repoSlug(options);
    const args = ['repo', 'create', slug, visibility, '--source=.', '--remote=origin'];
    if (options.push !== false) args.push('--push');

    const result = await execa('gh', args, { cwd, reject: false });
    if (result.exitCode !== 0) {
      throw new MyCliError(`gh repo create failed: ${result.stderr || result.stdout}`, {
        code: 'GIT_ERROR',
        details: { exitCode: result.exitCode },
      });
    }

    const view = await execa('gh', ['repo', 'view', '--json', 'url,sshUrl'], {
      cwd,
      reject: false,
    });
    let url = plan.url;
    if (view.exitCode === 0 && view.stdout.trim()) {
      try {
        const parsed = JSON.parse(view.stdout) as { url?: string; sshUrl?: string };
        url = parsed.url ? `${parsed.url}.git` : (parsed.sshUrl ?? url);
      } catch {
        // keep planned url
      }
    }

    return {
      url,
      remoteName: 'origin',
      commands: plan.commands,
      executed: true,
      message: `Created GitHub repository ${slug}`,
    };
  }
}

export class GitlabGitAdapter implements GitProviderAdapter {
  readonly provider = 'gitlab' as const;
  readonly cliTools = ['glab'];

  async isAvailable(): Promise<boolean> {
    if (!(await cliAvailable('glab'))) return false;
    const auth = await execa('glab', ['auth', 'status'], { reject: false });
    return auth.exitCode === 0;
  }

  planCreate(options: CreateRemoteRepoOptions): CreateRemoteRepoResult {
    const visibility = options.private ? '--private' : '--public';
    return {
      url: `https://gitlab.com/${repoSlug(options)}.git`,
      remoteName: 'origin',
      commands: [
        `glab repo create ${options.name} ${visibility} --defaultBranch ${options.branch ?? 'main'} --remote`,
      ],
      executed: false,
      message: 'Requires GitLab CLI (glab) authenticated via glab auth login',
    };
  }

  async executeCreate(options: CreateRemoteRepoOptions): Promise<CreateRemoteRepoResult> {
    const plan = this.planCreate(options);
    if (options.dryRun) return plan;

    if (!(await this.isAvailable())) {
      throw new MyCliError(
        'GitLab CLI (glab) is not installed or not authenticated. Run: glab auth login',
        {
          code: 'GIT_ERROR',
        },
      );
    }

    const cwd = options.cwd ?? process.cwd();
    const visibility = options.private ? '--private' : '--public';
    const args = [
      'repo',
      'create',
      options.name,
      visibility,
      '--defaultBranch',
      options.branch ?? 'main',
      '--remote',
    ];

    const result = await execa('glab', args, { cwd, reject: false });
    if (result.exitCode !== 0) {
      throw new MyCliError(`glab repo create failed: ${result.stderr || result.stdout}`, {
        code: 'GIT_ERROR',
      });
    }

    const remote = await execa('git', ['remote', 'get-url', 'origin'], { cwd, reject: false });
    const url = remote.exitCode === 0 ? remote.stdout.trim() : plan.url;

    return {
      url,
      remoteName: 'origin',
      commands: plan.commands,
      executed: true,
      message: `Created GitLab repository ${options.name}`,
    };
  }
}

export { BitbucketGitAdapter } from './bitbucket.js';
export { AzureDevOpsGitAdapter } from './azure-devops.js';

const ADAPTERS: GitProviderAdapter[] = [
  new GithubGitAdapter(),
  new GitlabGitAdapter(),
  new BitbucketGitAdapter(),
  new AzureDevOpsGitAdapter(),
];

export function getGitProviderAdapter(provider: GitProvider): GitProviderAdapter | undefined {
  return ADAPTERS.find((a) => a.provider === provider);
}

export function listGitProviderAdapters(): GitProviderAdapter[] {
  return ADAPTERS;
}
