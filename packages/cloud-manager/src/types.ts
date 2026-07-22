export type CloudProvider =
  | 'aws'
  | 'azure'
  | 'gcp'
  | 'digitalocean'
  | 'railway'
  | 'render'
  | 'fly'
  | 'vercel'
  | 'netlify';

export interface CloudDeployOptions {
  cwd?: string;
  provider: CloudProvider;
  appName: string;
  environment?: string;
  region?: string;
  image?: string;
  dryRun?: boolean;
}

export interface CloudDeployResult {
  provider: CloudProvider;
  success: boolean;
  url?: string;
  revision?: string;
  commands: string[];
  message: string;
}

export interface CloudStatusResult {
  provider: CloudProvider;
  status: 'running' | 'stopped' | 'deploying' | 'unknown';
  url?: string;
  revision?: string;
  message: string;
}

export interface CloudLogsResult {
  provider: CloudProvider;
  lines: string[];
  message: string;
}

export interface CloudSetupDocsOptions {
  cwd?: string;
  provider: CloudProvider;
  appName: string;
  environment?: string;
  dryRun?: boolean;
}

export interface CloudSetupDocsResult {
  files: string[];
}

export interface CloudValidateResult {
  provider: CloudProvider;
  ready: boolean;
  missingFiles: string[];
  missingEnv: string[];
  missingCli: string[];
  message: string;
}
