import type { CloudDeployOptions, CloudDeployResult } from '../types.js';
import type { CloudProviderAdapter } from './base.js';

export { defaultExecutor } from './base.js';
export type { CommandExecutor } from './base.js';

function buildResult(
  provider: CloudDeployOptions['provider'],
  commands: string[],
  message: string,
  success = true,
): CloudDeployResult {
  return {
    provider,
    success,
    commands,
    message,
    url: undefined,
    revision: undefined,
  };
}

function createCliAdapter(config: {
  name: CloudDeployOptions['provider'];
  files: string[];
  env: string[];
  cli: string[];
  pushCommand: (options: CloudDeployOptions) => string[];
  statusMessage: string;
}): CloudProviderAdapter {
  return {
    name: config.name,
    requiredFiles: () => config.files,
    requiredEnv: () => config.env,
    requiredCli: () => config.cli,
    planPush(options) {
      return buildResult(config.name, config.pushCommand(options), `Plan deploy to ${config.name}`);
    },
    async push(options, exec) {
      const commands = config.pushCommand(options);
      const outputs: string[] = [];
      for (const line of commands) {
        const [cmd, ...args] = line.split(' ');
        const result = await exec(cmd!, args, {
          cwd: options.cwd ?? process.cwd(),
          dryRun: options.dryRun,
        });
        outputs.push(result.stdout || result.stderr);
        if (!options.dryRun && result.exitCode !== 0) {
          return buildResult(
            config.name,
            commands,
            `Deploy failed: ${result.stderr || result.stdout}`,
            false,
          );
        }
      }
      return {
        ...buildResult(config.name, commands, config.statusMessage),
        url: outputs.join('\n').match(/https?:\/\/[^\s]+/)?.[0],
      };
    },
  };
}

export const railwayAdapter = createCliAdapter({
  name: 'railway',
  files: ['railway.json'],
  env: ['RAILWAY_TOKEN'],
  cli: ['railway'],
  pushCommand: () => ['railway up --detach'],
  statusMessage: 'Deployed to Railway',
});

export const flyAdapter = createCliAdapter({
  name: 'fly',
  files: ['fly.toml'],
  env: ['FLY_API_TOKEN'],
  cli: ['fly'],
  pushCommand: (o) => [`fly deploy --app ${o.appName}`],
  statusMessage: 'Deployed to Fly.io',
});

export const renderAdapter = createCliAdapter({
  name: 'render',
  files: ['render.yaml'],
  env: ['RENDER_API_KEY'],
  cli: ['render'],
  pushCommand: () => ['render deploys create --confirm'],
  statusMessage: 'Triggered Render deploy',
});

export const vercelAdapter = createCliAdapter({
  name: 'vercel',
  files: ['vercel.json'],
  env: ['VERCEL_TOKEN'],
  cli: ['vercel'],
  pushCommand: () => ['vercel deploy --prod'],
  statusMessage: 'Deployed to Vercel',
});

export const netlifyAdapter = createCliAdapter({
  name: 'netlify',
  files: ['netlify.toml'],
  env: ['NETLIFY_AUTH_TOKEN'],
  cli: ['netlify'],
  pushCommand: () => ['netlify deploy --prod'],
  statusMessage: 'Deployed to Netlify',
});

export const awsAdapter = createCliAdapter({
  name: 'aws',
  files: ['deploy/terraform/aws/main.tf'],
  env: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'],
  cli: ['terraform', 'aws'],
  pushCommand: () => [
    'terraform -chdir=deploy/terraform/aws init',
    'terraform -chdir=deploy/terraform/aws apply -auto-approve',
  ],
  statusMessage: 'Applied AWS Terraform stack',
});

export const gcpAdapter = createCliAdapter({
  name: 'gcp',
  files: ['deploy/terraform/gcp/main.tf'],
  env: ['GOOGLE_APPLICATION_CREDENTIALS'],
  cli: ['terraform', 'gcloud'],
  pushCommand: () => [
    'terraform -chdir=deploy/terraform/gcp init',
    'terraform -chdir=deploy/terraform/gcp apply -auto-approve',
  ],
  statusMessage: 'Applied GCP Terraform stack',
});

export const azureAdapter = createCliAdapter({
  name: 'azure',
  files: ['deploy/terraform/azure/main.tf'],
  env: ['AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET', 'AZURE_TENANT_ID'],
  cli: ['terraform', 'az'],
  pushCommand: () => [
    'terraform -chdir=deploy/terraform/azure init',
    'terraform -chdir=deploy/terraform/azure apply -auto-approve',
  ],
  statusMessage: 'Applied Azure Terraform stack',
});

export const digitaloceanAdapter = createCliAdapter({
  name: 'digitalocean',
  files: ['deploy/digitalocean/app.yaml'],
  env: ['DIGITALOCEAN_ACCESS_TOKEN'],
  cli: ['doctl'],
  pushCommand: () => [
    'doctl apps create --spec deploy/digitalocean/app.yaml --wait --format ID,DefaultIngress',
  ],
  statusMessage: 'Deployed to DigitalOcean App Platform',
});

export const providerAdapters: Record<string, CloudProviderAdapter> = {
  railway: railwayAdapter,
  fly: flyAdapter,
  render: renderAdapter,
  vercel: vercelAdapter,
  netlify: netlifyAdapter,
  aws: awsAdapter,
  gcp: gcpAdapter,
  azure: azureAdapter,
  digitalocean: digitaloceanAdapter,
};

export function getProviderAdapter(provider: CloudDeployOptions['provider']): CloudProviderAdapter {
  const adapter = providerAdapters[provider];
  if (!adapter) {
    throw new Error(`Unsupported cloud provider: ${provider}`);
  }
  return adapter;
}
