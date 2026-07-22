export type VersionStrategy = 'semver' | 'calver';

export interface ReleaseSetupOptions {
  cwd?: string;
  appName?: string;
  strategy?: VersionStrategy;
  branch?: string;
  dryRun?: boolean;
}

export interface ReleaseSetupResult {
  files: string[];
}
