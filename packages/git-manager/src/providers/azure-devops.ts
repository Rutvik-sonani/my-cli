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

function normalizeOrgUrl(organization?: string): string {
  if (!organization) return '';
  if (organization.startsWith('http')) return organization.replace(/\/$/, '');
  return `https://dev.azure.com/${organization}`;
}

export class AzureDevOpsGitAdapter implements GitProviderAdapter {
  readonly provider = 'azure-devops' as const;
  readonly cliTools = ['az'];

  async isAvailable(): Promise<boolean> {
    if (!(await cliAvailable('az'))) return false;
    const auth = await execa('az', ['account', 'show'], { reject: false });
    return auth.exitCode === 0;
  }

  planCreate(options: CreateRemoteRepoOptions): CreateRemoteRepoResult {
    const org = normalizeOrgUrl(options.organization) || 'https://dev.azure.com/<org>';
    const project = options.project ?? '<project>';
    const branch = options.branch ?? 'main';

    return {
      url: `${org}/${project}/_git/${options.name}`,
      remoteName: 'origin',
      commands: [
        `az repos create --name ${options.name} --project ${project} --organization ${org}`,
        `git remote add origin ${org}/${project}/_git/${options.name}`,
        `git push -u origin ${branch}`,
      ],
      executed: false,
      message: 'Requires Azure CLI (az login), --org, and --project',
    };
  }

  async executeCreate(options: CreateRemoteRepoOptions): Promise<CreateRemoteRepoResult> {
    const plan = this.planCreate(options);
    if (options.dryRun) return plan;

    if (!(await this.isAvailable())) {
      throw new MyCliError('Azure CLI (az) is not installed or not logged in. Run: az login', {
        code: 'GIT_ERROR',
      });
    }

    const org = normalizeOrgUrl(options.organization);
    if (!org) {
      throw new MyCliError('Azure DevOps requires --org (organization URL or slug)', {
        code: 'GIT_ERROR',
      });
    }

    if (!options.project) {
      throw new MyCliError('Azure DevOps requires --project', { code: 'GIT_ERROR' });
    }

    const cwd = options.cwd ?? process.cwd();
    const result = await execa(
      'az',
      [
        'repos',
        'create',
        '--name',
        options.name,
        '--project',
        options.project,
        '--organization',
        org,
        '--output',
        'json',
      ],
      { cwd, reject: false },
    );

    if (result.exitCode !== 0) {
      throw new MyCliError(`az repos create failed: ${result.stderr || result.stdout}`, {
        code: 'GIT_ERROR',
      });
    }

    let url = plan.url;
    try {
      const parsed = JSON.parse(result.stdout) as { remoteUrl?: string };
      if (parsed.remoteUrl) url = parsed.remoteUrl;
    } catch {
      // keep planned url
    }

    await execa('git', ['remote', 'add', 'origin', url], { cwd, reject: false });

    return {
      url,
      remoteName: 'origin',
      commands: plan.commands,
      executed: true,
      message: `Created Azure DevOps repository ${options.project}/${options.name}`,
    };
  }
}
