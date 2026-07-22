import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSystem } from '@mycli/filesystem';
import { afterEach, describe, expect, it } from 'vitest';
import { createDeploymentManager } from '../src/index.js';
import { featureTemplatesRoot } from './helpers.js';

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('DeploymentManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('generates AWS Terraform for ECS Fargate', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-tf-aws-'));
    const fs = createFileSystem(dir);
    const deploy = createDeploymentManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    const result = await deploy.setupTerraform({
      provider: 'aws',
      appName: 'shop',
      region: 'us-east-1',
    });

    expect(result.files).toContain('deploy/terraform/aws/main.tf');
    expect(result.files).toContain('deploy/terraform/aws/network.tf');
    expect(result.files).toContain('deploy/terraform/aws/database.tf');
    expect(result.files).toContain('deploy/terraform/aws/storage.tf');
    expect(result.files).toContain('deploy/terraform/aws/eks.tf');
    expect(result.files).toContain('deploy/terraform/aws/lambda.tf');
    expect(result.files).toContain('deploy/terraform/aws/cloudfront.tf');
    expect(result.files).toContain('deploy/terraform/aws/variables.tf');
    expect(result.files).toContain('deploy/terraform/aws/outputs.tf');
    expect(result.files).toContain('TERRAFORM.md');
    expect(result.files).toContain('DEPLOYMENT.md');

    const main = await readFile(join(dir, 'deploy/terraform/aws/main.tf'), 'utf8');
    expect(main).toContain('aws_ecs_cluster');
    expect(main).toContain('shop');

    const network = await readFile(join(dir, 'deploy/terraform/aws/network.tf'), 'utf8');
    expect(network).toContain('aws_vpc');

    const eks = await readFile(join(dir, 'deploy/terraform/aws/eks.tf'), 'utf8');
    expect(eks).toContain('aws_eks_cluster');

    const lambda = await readFile(join(dir, 'deploy/terraform/aws/lambda.tf'), 'utf8');
    expect(lambda).toContain('aws_lambda_function');

    const cloudfront = await readFile(join(dir, 'deploy/terraform/aws/cloudfront.tf'), 'utf8');
    expect(cloudfront).toContain('aws_cloudfront_distribution');

    const deployment = await readFile(join(dir, 'DEPLOYMENT.md'), 'utf8');
    expect(deployment).toContain('my deploy push');
  });

  it('generates GCP Cloud Run terraform', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-tf-gcp-'));
    const fs = createFileSystem(dir);
    const deploy = createDeploymentManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    const result = await deploy.setupTerraform({
      provider: 'gcp',
      appName: 'api',
      region: 'us-central1',
    });

    expect(result.files).toContain('deploy/terraform/gcp/main.tf');

    const main = await readFile(join(dir, 'deploy/terraform/gcp/main.tf'), 'utf8');
    expect(main).toContain('google_cloud_run_v2_service');
  });

  it('generates Railway config for PaaS provider', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-deploy-railway-'));
    const fs = createFileSystem(dir);
    const deploy = createDeploymentManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    const result = await deploy.setup({ provider: 'railway', appName: 'shop' });
    expect(result.files).toContain('railway.json');
    expect(result.files).toContain('DEPLOYMENT.md');

    const config = await readFile(join(dir, 'railway.json'), 'utf8');
    expect(config).toContain('NIXPACKS');
  });

  it('supports dry-run', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-deploy-dry-'));
    const fs = createFileSystem(dir);
    const deploy = createDeploymentManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    await deploy.setup({ provider: 'fly', appName: 'dry', dryRun: true });
    expect(await fileExists(join(dir, 'fly.toml'))).toBe(false);
  });

  it('generates DigitalOcean app spec', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-deploy-do-'));
    const fs = createFileSystem(dir);
    const deploy = createDeploymentManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    const result = await deploy.setup({ provider: 'digitalocean', appName: 'api' });
    expect(result.files).toContain('deploy/digitalocean/app.yaml');

    const spec = await readFile(join(dir, 'deploy/digitalocean/app.yaml'), 'utf8');
    expect(spec).toContain('name: api');
  });

  it('validates setup files exist', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-deploy-val-'));
    const fs = createFileSystem(dir);
    const deploy = createDeploymentManager({ cwd: dir, filesystem: fs });

    const before = await deploy.validateSetup('railway', dir);
    expect(before.ready).toBe(false);

    await fs.write('railway.json', '{}');
    const after = await deploy.validateSetup('railway', dir);
    expect(after.ready).toBe(true);
  });
});
