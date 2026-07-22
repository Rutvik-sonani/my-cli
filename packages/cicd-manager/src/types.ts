export type CicdProvider = 'github' | 'gitlab' | 'azure' | 'bitbucket' | 'jenkins';

export interface CicdSetupOptions {
  cwd?: string;
  provider: CicdProvider;
  appName: string;
  nodeVersion?: string;
  packageManager?: 'npm' | 'pnpm' | 'yarn' | 'bun';
  branch?: string;
  dryRun?: boolean;
}

export interface CicdSetupResult {
  files: string[];
}
