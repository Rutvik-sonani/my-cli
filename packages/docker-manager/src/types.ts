export type DockerEnvironment = 'development' | 'production' | 'testing';
export type DockerDatabase = 'postgres' | 'mysql' | 'mongodb' | 'none';

export interface DockerGenerateOptions {
  cwd?: string;
  appName: string;
  nodeVersion?: string;
  port?: number;
  database?: DockerDatabase;
  redis?: boolean;
  mailhog?: boolean;
  nginx?: boolean;
  environment?: DockerEnvironment;
  dryRun?: boolean;
}

export interface DockerGenerateResult {
  files: string[];
}
