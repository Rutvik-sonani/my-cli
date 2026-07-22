export type ArchitectureType =
  | 'monolith'
  | 'modular-monolith'
  | 'microservice'
  | 'monorepo'
  | 'polyrepo';

export interface ArchitectureSetupOptions {
  cwd?: string;
  architecture: ArchitectureType;
  appName: string;
  backend?: string;
  frontend?: string;
  dryRun?: boolean;
}

export interface ArchitectureSetupResult {
  files: string[];
}
