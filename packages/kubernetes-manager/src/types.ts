export interface KubernetesSetupOptions {
  cwd?: string;
  appName: string;
  port?: number;
  image?: string;
  host?: string;
  replicas?: number;
  minReplicas?: number;
  maxReplicas?: number;
  environment?: string;
  tlsEnabled?: boolean;
  cpuRequest?: string;
  cpuLimit?: string;
  memoryRequest?: string;
  memoryLimit?: string;
  dryRun?: boolean;
}

export interface KubernetesSetupResult {
  files: string[];
}

export interface HelmSetupOptions extends KubernetesSetupOptions {}

export interface HelmSetupResult {
  files: string[];
}
