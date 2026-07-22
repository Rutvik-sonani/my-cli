import { join } from 'node:path';

export interface PrivacyPathConfig {
  privacy?: string;
}

export interface PrivacyPaths {
  root: string;
  consent: string;
  cookies: string;
  processing: string;
  export: string;
  deletion: string;
}

export function resolvePrivacyPaths(config: PrivacyPathConfig = {}): PrivacyPaths {
  const root = config.privacy ?? 'src/privacy';

  return {
    root,
    consent: join(root, 'consent'),
    cookies: join(root, 'cookies'),
    processing: join(root, 'processing'),
    export: join(root, 'export'),
    deletion: join(root, 'deletion'),
  };
}

export function getPrivacyEnvLines(appName: string): string[] {
  return [
    `PRIVACY_APP=${appName}`,
    'PRIVACY_ENABLED=true',
    'PRIVACY_EXPORT_DIR=./data/privacy-exports',
    'PRIVACY_TOMBSTONE_ON_DELETE=true',
  ];
}
