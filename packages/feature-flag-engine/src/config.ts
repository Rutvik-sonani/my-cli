import { join } from 'node:path';
import type { FeatureFlagProviderId } from '@mycli/enterprise-core';

export interface FeatureFlagPathConfig {
  featureFlags?: string;
}

export interface FeatureFlagPaths {
  root: string;
  providers: string;
  targeting: string;
}

export function resolveFeatureFlagPaths(config: FeatureFlagPathConfig = {}): FeatureFlagPaths {
  const root = config.featureFlags ?? 'src/feature-flags';

  return {
    root,
    providers: join(root, 'providers'),
    targeting: join(root, 'targeting'),
  };
}

export const FEATURE_FLAG_PROVIDERS: FeatureFlagProviderId[] = [
  'database',
  'launchdarkly',
  'unleash',
];

export function normalizeFeatureFlagProvider(input: string): FeatureFlagProviderId | null {
  const value = input.toLowerCase().replace(/_/g, '-');
  if (value === 'db' || value === 'json' || value === 'local') return 'database';
  if (value === 'ld' || value === 'launch-darkly') return 'launchdarkly';
  return FEATURE_FLAG_PROVIDERS.includes(value as FeatureFlagProviderId)
    ? (value as FeatureFlagProviderId)
    : null;
}

export function getFeatureFlagEnvLines(appName: string, provider: FeatureFlagProviderId): string[] {
  const lines = [
    `FEATURE_FLAGS_APP=${appName}`,
    `FEATURE_FLAGS_PROVIDER=${provider}`,
    'FEATURE_FLAGS_ENABLED=true',
  ];
  switch (provider) {
    case 'database':
      lines.push('FEATURE_FLAGS_PATH=config/feature-flags.json');
      break;
    case 'launchdarkly':
      lines.push('LAUNCHDARKLY_SDK_KEY=');
      lines.push('LAUNCHDARKLY_ENVIRONMENT=production');
      break;
    case 'unleash':
      lines.push('UNLEASH_URL=http://localhost:4242/api');
      lines.push('UNLEASH_API_TOKEN=');
      lines.push(`UNLEASH_APP_NAME=${appName}`);
      break;
  }
  return lines;
}

export function getFeatureFlagDependencies(provider: FeatureFlagProviderId): {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
} {
  switch (provider) {
    case 'launchdarkly':
      return { dependencies: { '@launchdarkly/node-server-sdk': '^9.0.0' }, devDependencies: {} };
    case 'unleash':
      return { dependencies: { 'unleash-client': '^6.0.0' }, devDependencies: {} };
    default:
      return { dependencies: {}, devDependencies: {} };
  }
}

export function providerTemplateFile(provider: FeatureFlagProviderId): string {
  return `features/feature-flags/providers/${provider}.provider.ts.ejs`;
}

export function providerClassName(provider: FeatureFlagProviderId): string {
  switch (provider) {
    case 'database':
      return 'DatabaseFeatureFlagProvider';
    case 'launchdarkly':
      return 'LaunchDarklyFeatureFlagProvider';
    case 'unleash':
      return 'UnleashFeatureFlagProvider';
  }
}
