import type {
  CloudDeployOptions,
  CloudDeployResult,
  CloudLogsResult,
  CloudProvider,
} from '../types.js';
import type { CommandExecutor } from './base.js';

function splitOutput(output: string, lines: number): string[] {
  return output.split('\n').filter(Boolean).slice(-lines);
}

export async function fetchProviderLogs(
  provider: CloudProvider,
  appName: string,
  cwd: string,
  lines: number,
  exec: CommandExecutor,
): Promise<CloudLogsResult> {
  switch (provider) {
    case 'fly': {
      const result = await exec('fly', ['logs', '--app', appName], { cwd });
      return {
        provider,
        lines: splitOutput(result.stdout || result.stderr, lines),
        message: result.exitCode === 0 ? 'Fly.io logs' : result.stderr || result.stdout,
      };
    }
    case 'railway': {
      const result = await exec('railway', ['logs'], { cwd });
      return {
        provider,
        lines: splitOutput(result.stdout || result.stderr, lines),
        message: result.exitCode === 0 ? 'Railway logs' : result.stderr || result.stdout,
      };
    }
    case 'vercel': {
      const result = await exec('vercel', ['logs', appName, '--output', 'raw'], { cwd });
      return {
        provider,
        lines: splitOutput(result.stdout || result.stderr, lines),
        message: result.exitCode === 0 ? 'Vercel logs' : result.stderr || result.stdout,
      };
    }
    case 'netlify': {
      const result = await exec('netlify', ['logs:function'], { cwd });
      return {
        provider,
        lines: splitOutput(result.stdout || result.stderr, lines),
        message: result.exitCode === 0 ? 'Netlify logs' : result.stderr || result.stdout,
      };
    }
    case 'render': {
      const result = await exec('render', ['logs', '--service', appName, '--tail', String(lines)], {
        cwd,
      });
      return {
        provider,
        lines: splitOutput(result.stdout || result.stderr, lines),
        message: result.exitCode === 0 ? 'Render logs' : result.stderr || result.stdout,
      };
    }
    case 'digitalocean': {
      const result = await exec(
        'doctl',
        ['apps', 'logs', appName, '--type', 'run', '--tail', String(lines)],
        {
          cwd,
        },
      );
      return {
        provider,
        lines: splitOutput(result.stdout || result.stderr, lines),
        message: result.exitCode === 0 ? 'DigitalOcean logs' : result.stderr || result.stdout,
      };
    }
    case 'aws':
    case 'gcp':
    case 'azure': {
      const result = await exec('terraform', [`-chdir=deploy/terraform/${provider}`, 'output'], {
        cwd,
      });
      return {
        provider,
        lines: splitOutput(result.stdout || result.stderr, lines),
        message:
          result.exitCode === 0
            ? `${provider.toUpperCase()} Terraform outputs (use cloud console for runtime logs)`
            : result.stderr || result.stdout,
      };
    }
    default:
      return {
        provider,
        lines: [`Logs not available for ${provider}`],
        message: 'Unsupported provider for logs',
      };
  }
}

export async function rollbackProvider(
  options: CloudDeployOptions,
  exec: CommandExecutor,
): Promise<CloudDeployResult> {
  const cwd = options.cwd ?? process.cwd();
  const { provider, appName } = options;

  const plans: Record<CloudProvider, string[]> = {
    fly: [
      `fly releases list --app ${appName}`,
      `fly deploy --app ${appName} --image <previous-release-image>`,
    ],
    railway: [`railway redeploy --service ${appName}`],
    vercel: ['vercel rollback --yes'],
    netlify: ['netlify rollback'],
    render: [`render deploys rollback --service ${appName}`],
    digitalocean: [`doctl apps create-deployment ${appName} --rollback`],
    aws: ['terraform -chdir=deploy/terraform/aws apply -auto-approve -var=image_tag=previous'],
    gcp: ['terraform -chdir=deploy/terraform/gcp apply -auto-approve -var=image_tag=previous'],
    azure: ['terraform -chdir=deploy/terraform/azure apply -auto-approve -var=image_tag=previous'],
  };

  const commands = plans[provider] ?? [`# rollback ${provider}`];

  if (options.dryRun) {
    return {
      provider,
      success: true,
      commands,
      message: `Plan rollback for ${provider}`,
    };
  }

  switch (provider) {
    case 'fly': {
      const list = await exec('fly', ['releases', 'list', '--app', appName], { cwd });
      if (list.exitCode !== 0) {
        return { provider, success: false, commands, message: list.stderr || list.stdout };
      }
      return {
        provider,
        success: true,
        commands,
        message: `Fly releases listed — deploy previous image: ${list.stdout.split('\n').slice(0, 5).join(' ')}`,
      };
    }
    case 'railway': {
      const result = await exec('railway', ['redeploy'], { cwd });
      return {
        provider,
        success: result.exitCode === 0,
        commands,
        message:
          result.exitCode === 0 ? 'Railway redeploy triggered' : result.stderr || result.stdout,
      };
    }
    case 'vercel': {
      const result = await exec('vercel', ['rollback', '--yes'], { cwd });
      return {
        provider,
        success: result.exitCode === 0,
        commands,
        message:
          result.exitCode === 0 ? 'Vercel rollback complete' : result.stderr || result.stdout,
      };
    }
    case 'netlify': {
      const result = await exec('netlify', ['rollback'], { cwd });
      return {
        provider,
        success: result.exitCode === 0,
        commands,
        message:
          result.exitCode === 0 ? 'Netlify rollback complete' : result.stderr || result.stdout,
      };
    }
    case 'render': {
      const result = await exec('render', ['deploys', 'rollback', '--service', appName], { cwd });
      return {
        provider,
        success: result.exitCode === 0,
        commands,
        message:
          result.exitCode === 0 ? 'Render rollback triggered' : result.stderr || result.stdout,
      };
    }
    case 'digitalocean': {
      const result = await exec('doctl', ['apps', 'create-deployment', appName, '--rollback'], {
        cwd,
      });
      return {
        provider,
        success: result.exitCode === 0,
        commands,
        message:
          result.exitCode === 0
            ? 'DigitalOcean rollback triggered'
            : result.stderr || result.stdout,
      };
    }
    default:
      return {
        provider,
        success: false,
        commands,
        message: `Rollback for ${provider} — run Terraform or provider dashboard manually`,
      };
  }
}

export async function destroyProvider(
  options: CloudDeployOptions,
  exec: CommandExecutor,
): Promise<CloudDeployResult> {
  const cwd = options.cwd ?? process.cwd();
  const { provider, appName } = options;

  if (provider === 'aws' || provider === 'gcp' || provider === 'azure') {
    const dir = `deploy/terraform/${provider}`;
    const commands = [`terraform -chdir=${dir} destroy -auto-approve`];
    if (options.dryRun) {
      return { provider, success: true, commands, message: `Plan destroy for ${provider}` };
    }
    const result = await exec('terraform', [`-chdir=${dir}`, 'destroy', '-auto-approve'], { cwd });
    return {
      provider,
      success: result.exitCode === 0,
      commands,
      message:
        result.exitCode === 0 ? `Destroyed ${provider} stack` : result.stderr || result.stdout,
    };
  }

  const commands: Record<CloudProvider, string[]> = {
    fly: [`fly apps destroy ${appName} --yes`],
    railway: ['railway service delete --yes'],
    vercel: [`vercel remove ${appName} --yes`],
    netlify: [`netlify sites:delete --name ${appName}`],
    render: [`render services delete ${appName} --confirm`],
    digitalocean: [`doctl apps delete ${appName} --force`],
    aws: [],
    gcp: [],
    azure: [],
  };

  const plan = commands[provider] ?? [`# destroy ${provider} app ${appName}`];

  if (options.dryRun) {
    return { provider, success: true, commands: plan, message: `Plan destroy for ${provider}` };
  }

  switch (provider) {
    case 'fly': {
      const result = await exec('fly', ['apps', 'destroy', appName, '--yes'], { cwd });
      return {
        provider,
        success: result.exitCode === 0,
        commands: plan,
        message:
          result.exitCode === 0 ? `Destroyed Fly app ${appName}` : result.stderr || result.stdout,
      };
    }
    case 'vercel': {
      const result = await exec('vercel', ['remove', appName, '--yes'], { cwd });
      return {
        provider,
        success: result.exitCode === 0,
        commands: plan,
        message:
          result.exitCode === 0
            ? `Removed Vercel project ${appName}`
            : result.stderr || result.stdout,
      };
    }
    case 'netlify': {
      const result = await exec('netlify', ['sites:delete', '--name', appName], { cwd });
      return {
        provider,
        success: result.exitCode === 0,
        commands: plan,
        message:
          result.exitCode === 0
            ? `Deleted Netlify site ${appName}`
            : result.stderr || result.stdout,
      };
    }
    case 'railway': {
      const result = await exec('railway', ['service', 'delete', '--yes'], { cwd });
      return {
        provider,
        success: result.exitCode === 0,
        commands: plan,
        message: result.exitCode === 0 ? 'Railway service deleted' : result.stderr || result.stdout,
      };
    }
    case 'render': {
      const result = await exec('render', ['services', 'delete', appName, '--confirm'], { cwd });
      return {
        provider,
        success: result.exitCode === 0,
        commands: plan,
        message:
          result.exitCode === 0
            ? `Deleted Render service ${appName}`
            : result.stderr || result.stdout,
      };
    }
    case 'digitalocean': {
      const result = await exec('doctl', ['apps', 'delete', appName, '--force'], { cwd });
      return {
        provider,
        success: result.exitCode === 0,
        commands: plan,
        message:
          result.exitCode === 0
            ? `Deleted DigitalOcean app ${appName}`
            : result.stderr || result.stdout,
      };
    }
    default:
      return {
        provider,
        success: false,
        commands: plan,
        message: `Destroy for ${provider} — use provider dashboard`,
      };
  }
}

export async function fetchProviderStatus(
  provider: CloudProvider,
  appName: string,
  cwd: string,
  exec: CommandExecutor,
): Promise<{ status: 'running' | 'stopped' | 'deploying' | 'unknown'; message: string }> {
  switch (provider) {
    case 'fly': {
      const result = await exec('fly', ['status', '--app', appName], { cwd });
      return {
        status: result.exitCode === 0 ? 'running' : 'unknown',
        message: result.stdout || result.stderr,
      };
    }
    case 'railway': {
      const result = await exec('railway', ['status'], { cwd });
      return {
        status: result.exitCode === 0 ? 'running' : 'unknown',
        message: result.stdout || result.stderr,
      };
    }
    case 'vercel': {
      const result = await exec('vercel', ['ls', appName], { cwd });
      return {
        status: result.exitCode === 0 ? 'running' : 'unknown',
        message: result.stdout || result.stderr,
      };
    }
    case 'netlify': {
      const result = await exec('netlify', ['status'], { cwd });
      return {
        status: result.exitCode === 0 ? 'running' : 'unknown',
        message: result.stdout || result.stderr,
      };
    }
    case 'render': {
      const result = await exec('render', ['services', 'status', appName], { cwd });
      return {
        status: result.exitCode === 0 ? 'running' : 'unknown',
        message: result.stdout || result.stderr,
      };
    }
    case 'digitalocean': {
      const result = await exec('doctl', ['apps', 'get', appName], { cwd });
      return {
        status: result.exitCode === 0 ? 'running' : 'unknown',
        message: result.stdout || result.stderr,
      };
    }
    default:
      return { status: 'unknown', message: `Status for ${provider} — check deploy config files` };
  }
}
