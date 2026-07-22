export type SecretsProvider =
  | 'aws'
  | 'azure'
  | 'gcp'
  | 'digitalocean'
  | 'railway'
  | 'render'
  | 'fly'
  | 'vercel'
  | 'netlify';

export interface SecretEntry {
  key: string;
  value: string;
}

export interface SecretsSyncOptions {
  cwd?: string;
  provider: SecretsProvider;
  appName: string;
  environment?: string;
  envFile?: string;
  dryRun?: boolean;
}

export interface SecretsSyncResult {
  provider: SecretsProvider;
  synced: SecretEntry[];
  skipped: string[];
  commands: string[];
  message: string;
}

export interface SecretsPlanResult {
  provider: SecretsProvider;
  toSync: SecretEntry[];
  skipped: string[];
  commands: string[];
}

export interface SecretsSetupOptions {
  cwd?: string;
  provider: SecretsProvider;
  appName: string;
  environment?: string;
  dryRun?: boolean;
}

export interface SecretsSetupResult {
  files: string[];
}
