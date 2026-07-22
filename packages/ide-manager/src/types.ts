export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

export interface IdeSetupOptions {
  appName: string;
  cwd?: string;
  nodeVersion?: string;
  packageManager?: PackageManager;
  port?: number;
  includeDevcontainer?: boolean;
  includeVscode?: boolean;
  includeCursor?: boolean;
  useDockerCompose?: boolean;
  dryRun?: boolean;
}

export interface IdeSetupResult {
  files: string[];
}
