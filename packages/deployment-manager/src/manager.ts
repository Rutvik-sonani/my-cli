import { join } from 'node:path';
import { type FileSystem, createFileSystem } from '@mycli-cli/filesystem';
import { type TemplateEngine, createTemplateEngine } from '@mycli-cli/template-engine';
import type {
  DeploymentProvider,
  DeploymentSetupOptions,
  DeploymentSetupResult,
  TerraformSetupOptions,
  TerraformSetupResult,
} from './types.js';

function buildDeployData(options: {
  appName: string;
  provider?: string;
  region?: string;
  port?: number;
  image?: string;
  environment?: string;
  minReplicas?: number;
  maxReplicas?: number;
  cpuLimit?: string;
  memoryLimit?: string;
}): Record<string, unknown> {
  return {
    appName: options.appName,
    provider: options.provider ?? 'aws',
    region: options.region ?? 'us-east-1',
    port: options.port ?? 3000,
    image: options.image ?? `${options.appName}:latest`,
    environment: options.environment ?? 'production',
    minReplicas: options.minReplicas ?? 1,
    maxReplicas: options.maxReplicas ?? 5,
    cpuLimit: options.cpuLimit ?? '512',
    memoryLimit: options.memoryLimit ?? '1024',
  };
}

/**
 * Generates cloud/platform deployment and Terraform configuration via EJS templates.
 */
export class DeploymentManager {
  private readonly fs: FileSystem;
  private readonly templates: TemplateEngine;

  constructor(
    options: {
      cwd?: string;
      filesystem?: FileSystem;
      templateEngine?: TemplateEngine;
      templatesRoot?: string;
    } = {},
  ) {
    const cwd = options.cwd ?? process.cwd();
    this.fs = options.filesystem ?? createFileSystem(cwd);
    this.templates =
      options.templateEngine ??
      createTemplateEngine({
        filesystem: this.fs,
        templatesRoot: options.templatesRoot ?? 'templates',
      });
  }

  async setup(options: DeploymentSetupOptions): Promise<DeploymentSetupResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const data = buildDeployData({ ...options, provider: options.provider });
    const written: string[] = [];

    if (options.provider === 'aws' || options.provider === 'gcp' || options.provider === 'azure') {
      const result = await this.setupTerraform({
        cwd,
        provider: options.provider,
        appName: options.appName,
        region: options.region,
        port: options.port,
        image: options.image,
        environment: options.environment,
        minReplicas: options.minReplicas,
        maxReplicas: options.maxReplicas,
        cpuLimit: options.cpuLimit,
        memoryLimit: options.memoryLimit,
        dryRun: options.dryRun,
      });
      return result;
    }

    const paasFiles = this.paasTemplates(options.provider);
    for (const file of paasFiles) {
      const content = await this.templates.renderFile(file.template, { data });
      if (!options.dryRun) {
        await fs.write(file.out, content);
      }
      written.push(file.out);
    }

    const deploymentDoc = await this.writeDeploymentGuide({
      appName: options.appName,
      provider: options.provider,
      environment: options.environment,
      cwd,
      dryRun: options.dryRun,
    });
    written.push(deploymentDoc);

    return { files: written };
  }

  async validateSetup(
    provider: DeploymentProvider,
    cwd?: string,
  ): Promise<import('./types.js').DeploymentValidateResult> {
    const root = cwd ?? this.fs.getRoot();
    const fs = createFileSystem(root);
    const required = this.requiredFiles(provider);
    const missingFiles: string[] = [];
    for (const file of required) {
      if (!(await fs.exists(file))) missingFiles.push(file);
    }
    return {
      provider,
      ready: missingFiles.length === 0,
      missingFiles,
      message:
        missingFiles.length === 0
          ? `Deployment config ready for ${provider}`
          : `Missing deployment files for ${provider}`,
    };
  }

  private requiredFiles(provider: DeploymentProvider): string[] {
    switch (provider) {
      case 'railway':
        return ['railway.json'];
      case 'render':
        return ['render.yaml'];
      case 'fly':
        return ['fly.toml'];
      case 'vercel':
        return ['vercel.json'];
      case 'netlify':
        return ['netlify.toml'];
      case 'aws':
        return ['deploy/terraform/aws/main.tf'];
      case 'gcp':
        return ['deploy/terraform/gcp/main.tf'];
      case 'azure':
        return ['deploy/terraform/azure/main.tf'];
      case 'digitalocean':
        return ['deploy/digitalocean/app.yaml'];
      default:
        return [`deploy/${provider}/README.md`];
    }
  }

  async setupTerraform(options: TerraformSetupOptions): Promise<TerraformSetupResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const data = buildDeployData({ ...options, provider: options.provider });
    const base = join('deploy', 'terraform', options.provider);
    const written: string[] = [];

    const files = [
      {
        template: `features/terraform/${options.provider}/main.tf.ejs`,
        out: join(base, 'main.tf'),
      },
      {
        template: `features/terraform/${options.provider}/variables.tf.ejs`,
        out: join(base, 'variables.tf'),
      },
      ...(options.provider === 'aws'
        ? [
            { template: 'features/terraform/aws/network.tf.ejs', out: join(base, 'network.tf') },
            { template: 'features/terraform/aws/database.tf.ejs', out: join(base, 'database.tf') },
            { template: 'features/terraform/aws/storage.tf.ejs', out: join(base, 'storage.tf') },
            { template: 'features/terraform/aws/eks.tf.ejs', out: join(base, 'eks.tf') },
            { template: 'features/terraform/aws/lambda.tf.ejs', out: join(base, 'lambda.tf') },
            {
              template: 'features/terraform/aws/cloudfront.tf.ejs',
              out: join(base, 'cloudfront.tf'),
            },
          ]
        : []),
      ...(options.provider === 'aws' || options.provider === 'gcp' || options.provider === 'azure'
        ? [
            {
              template: `features/terraform/${options.provider}/outputs.tf.ejs`,
              out: join(base, 'outputs.tf'),
            },
          ]
        : []),
      {
        template: `features/terraform/${options.provider}/TERRAFORM.md.ejs`,
        out: join(base, 'TERRAFORM.md'),
      },
    ];

    for (const file of files) {
      const content = await this.templates.renderFile(file.template, { data });
      if (!options.dryRun) {
        await fs.write(file.out, content);
      }
      written.push(file.out);
    }

    const rootDoc = await this.templates.renderFile(
      `features/terraform/${options.provider}/TERRAFORM.md.ejs`,
      { data },
    );
    if (!options.dryRun) {
      await fs.write('TERRAFORM.md', rootDoc);
    }
    written.push('TERRAFORM.md');

    const deploymentDoc = await this.writeDeploymentGuide({
      appName: options.appName,
      provider: options.provider,
      environment: options.environment ?? 'production',
      cwd,
      dryRun: options.dryRun,
    });
    written.push(deploymentDoc);

    return { files: written };
  }

  async writeDeploymentGuide(options: {
    appName: string;
    provider: string;
    environment?: string;
    cwd?: string;
    dryRun?: boolean;
  }): Promise<string> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const content = await this.templates.renderFile('features/deploy/DEPLOYMENT.md.ejs', {
      data: {
        appName: options.appName,
        provider: options.provider,
        environment: options.environment ?? 'production',
      },
    });
    if (!options.dryRun) {
      await fs.write('DEPLOYMENT.md', content);
    }
    return 'DEPLOYMENT.md';
  }

  private paasTemplates(provider: DeploymentProvider): Array<{ template: string; out: string }> {
    switch (provider) {
      case 'railway':
        return [{ template: 'features/deploy/railway.json.ejs', out: 'railway.json' }];
      case 'render':
        return [{ template: 'features/deploy/render.yaml.ejs', out: 'render.yaml' }];
      case 'fly':
        return [{ template: 'features/deploy/fly.toml.ejs', out: 'fly.toml' }];
      case 'vercel':
        return [{ template: 'features/deploy/vercel.json.ejs', out: 'vercel.json' }];
      case 'netlify':
        return [{ template: 'features/deploy/netlify.toml.ejs', out: 'netlify.toml' }];
      case 'digitalocean':
        return [
          {
            template: 'features/deploy/digitalocean/app.yaml.ejs',
            out: 'deploy/digitalocean/app.yaml',
          },
        ];
      default:
        return [
          {
            template: 'features/deploy/custom.README.md.ejs',
            out: `deploy/${provider}/README.md`,
          },
        ];
    }
  }
}

export function createDeploymentManager(options?: {
  cwd?: string;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
}): DeploymentManager {
  return new DeploymentManager(options);
}

export type {
  DeploymentProvider,
  DeploymentSetupOptions,
  DeploymentSetupResult,
  DeploymentValidateResult,
  TerraformProvider,
  TerraformSetupOptions,
  TerraformSetupResult,
} from './types.js';
