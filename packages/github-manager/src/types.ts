export interface GithubSetupOptions {
  cwd?: string;
  appName: string;
  nodeVersion?: string;
  packageManager?: 'npm' | 'pnpm' | 'yarn' | 'bun';
  branch?: string;
  includeReleaseWorkflow?: boolean;
  includeDeployWorkflow?: boolean;
  includeRenovate?: boolean;
  dryRun?: boolean;
}

export interface GithubSetupResult {
  files: string[];
}
