import { MyCliError } from '@mycli-cli/core';
import { execa } from 'execa';
import type {
  CreateRemoteRepoOptions,
  CreateRemoteRepoResult,
  GitProviderAdapter,
} from '../types.js';

async function cliAvailable(binary: string): Promise<boolean> {
  try {
    const result = await execa(binary, ['--version'], { reject: false });
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

function workspaceSlug(options: CreateRemoteRepoOptions): string | undefined {
  return options.owner ?? process.env.BITBUCKET_WORKSPACE;
}

function bitbucketToken(): string | undefined {
  return process.env.BITBUCKET_TOKEN ?? process.env.BITBUCKET_APP_PASSWORD;
}

function authHeader(): string {
  const token = bitbucketToken();
  if (!token) {
    throw new MyCliError(
      'Bitbucket requires BITBUCKET_TOKEN or BITBUCKET_APP_PASSWORD in the environment',
      { code: 'GIT_ERROR' },
    );
  }

  const username = process.env.BITBUCKET_USERNAME;
  if (username) {
    return `Basic ${Buffer.from(`${username}:${token}`).toString('base64')}`;
  }

  return `Bearer ${token}`;
}

function cloneUrl(
  workspace: string,
  name: string,
  links?: Array<{ name?: string; href?: string }>,
): string {
  const https = links?.find((link) => link.name === 'https')?.href;
  if (https) return https;
  return `https://bitbucket.org/${workspace}/${name}.git`;
}

export class BitbucketGitAdapter implements GitProviderAdapter {
  readonly provider = 'bitbucket' as const;
  readonly cliTools = ['bb'];

  async isAvailable(): Promise<boolean> {
    if (bitbucketToken()) return true;
    return cliAvailable('bb');
  }

  planCreate(options: CreateRemoteRepoOptions): CreateRemoteRepoResult {
    const workspace = workspaceSlug(options) ?? '<workspace>';
    const visibility = options.private ? 'private' : 'public';
    const branch = options.branch ?? 'main';

    return {
      url: `https://bitbucket.org/${workspace}/${options.name}.git`,
      remoteName: 'origin',
      commands: [
        `# POST https://api.bitbucket.org/2.0/repositories/${workspace}/${options.name} (${visibility})`,
        `git remote add origin https://bitbucket.org/${workspace}/${options.name}.git`,
        `git push -u origin ${branch}`,
      ],
      executed: false,
      message:
        'Requires BITBUCKET_TOKEN (or app password) and workspace via --owner or BITBUCKET_WORKSPACE',
    };
  }

  async executeCreate(options: CreateRemoteRepoOptions): Promise<CreateRemoteRepoResult> {
    const plan = this.planCreate(options);
    if (options.dryRun) return plan;

    const workspace = workspaceSlug(options);
    if (!workspace) {
      throw new MyCliError('Bitbucket requires --owner (workspace slug) or BITBUCKET_WORKSPACE', {
        code: 'GIT_ERROR',
      });
    }

    if ((await cliAvailable('bb')) && !bitbucketToken()) {
      return this.createWithBbCli(options, workspace, plan);
    }

    const response = await fetch(
      `https://api.bitbucket.org/2.0/repositories/${workspace}/${options.name}`,
      {
        method: 'POST',
        headers: {
          Authorization: authHeader(),
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          scm: 'git',
          is_private: Boolean(options.private),
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new MyCliError(`Bitbucket API failed (${response.status}): ${body}`, {
        code: 'GIT_ERROR',
      });
    }

    const payload = (await response.json()) as {
      links?: { clone?: Array<{ name?: string; href?: string }> };
    };
    const url = cloneUrl(workspace, options.name, payload.links?.clone);
    const cwd = options.cwd ?? process.cwd();

    if (options.push === false) {
      await execa('git', ['remote', 'add', 'origin', url], { cwd, reject: false });
    } else {
      await execa('git', ['remote', 'add', 'origin', url], { cwd, reject: false });
    }

    return {
      url,
      remoteName: 'origin',
      commands: plan.commands,
      executed: true,
      message: `Created Bitbucket repository ${workspace}/${options.name}`,
    };
  }

  private async createWithBbCli(
    options: CreateRemoteRepoOptions,
    workspace: string,
    plan: CreateRemoteRepoResult,
  ): Promise<CreateRemoteRepoResult> {
    const cwd = options.cwd ?? process.cwd();
    const args = ['repo', 'create', options.name, '--workspace', workspace];
    if (options.private) args.push('--private');

    const result = await execa('bb', args, { cwd, reject: false });
    if (result.exitCode !== 0) {
      throw new MyCliError(`bb repo create failed: ${result.stderr || result.stdout}`, {
        code: 'GIT_ERROR',
      });
    }

    const url = `https://bitbucket.org/${workspace}/${options.name}.git`;
    await execa('git', ['remote', 'add', 'origin', url], { cwd, reject: false });

    return {
      url,
      remoteName: 'origin',
      commands: [
        `bb repo create ${options.name} --workspace ${workspace}`,
        ...plan.commands.slice(1),
      ],
      executed: true,
      message: `Created Bitbucket repository ${workspace}/${options.name}`,
    };
  }
}
