import type { RegistryEntry } from '@mycli-cli/registry-manager';

export interface MarketplaceInstallOptions {
  name: string;
  version?: string;
  source?: 'local' | 'npm' | 'auto';
  options?: Record<string, unknown>;
  dryRun?: boolean;
}

export interface MarketplaceInstallResult {
  name: string;
  version: string;
  path: string;
  message: string;
}

export interface MarketplacePublishOptions {
  pluginDir: string;
  dryRun?: boolean;
  publishToNpm?: boolean;
}

export interface MarketplacePublishResult {
  entry: RegistryEntry;
  catalogPath: string;
  communityPath: string;
  npmCommands?: string[];
}
