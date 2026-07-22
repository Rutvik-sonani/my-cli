import { join } from 'node:path';

export interface OrganizationPathConfig {
  organizations?: string;
}

export interface OrganizationPaths {
  root: string;
  services: string;
}

export function resolveOrganizationPaths(config: OrganizationPathConfig = {}): OrganizationPaths {
  const root = config.organizations ?? 'src/organizations';

  return {
    root,
    services: join(root, 'services'),
  };
}

export function getOrganizationEnvLines(appName: string): string[] {
  return [
    `ORGANIZATION_APP=${appName}`,
    'ORGANIZATION_ENABLED=true',
    'ORGANIZATION_DEFAULT_ROLE=member',
  ];
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
