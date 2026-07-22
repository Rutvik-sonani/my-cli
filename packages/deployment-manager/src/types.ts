export type DeploymentProvider =
  | 'aws'
  | 'azure'
  | 'gcp'
  | 'digitalocean'
  | 'railway'
  | 'render'
  | 'fly'
  | 'vercel'
  | 'netlify'
  | 'custom';

export type TerraformProvider = 'aws' | 'gcp' | 'azure';

export interface DeploymentSetupOptions {
  cwd?: string;
  provider: DeploymentProvider;
  appName: string;
  region?: string;
  port?: number;
  image?: string;
  environment?: string;
  minReplicas?: number;
  maxReplicas?: number;
  cpuLimit?: string;
  memoryLimit?: string;
  dryRun?: boolean;
}

export interface DeploymentSetupResult {
  files: string[];
}

export interface DeploymentValidateResult {
  provider: DeploymentProvider;
  ready: boolean;
  missingFiles: string[];
  message: string;
}

export interface TerraformSetupOptions {
  cwd?: string;
  provider: TerraformProvider;
  appName: string;
  region?: string;
  port?: number;
  image?: string;
  environment?: string;
  minReplicas?: number;
  maxReplicas?: number;
  cpuLimit?: string;
  memoryLimit?: string;
  dryRun?: boolean;
}

export interface TerraformSetupResult {
  files: string[];
}
