import type { LogLevel } from '../logger/types.js';

export type RuntimeEnvironment = 'development' | 'production' | 'test';

export interface ApplicationContextOptions {
  cwd?: string;
  version?: string;
  environment?: RuntimeEnvironment;
  logLevel?: LogLevel;
  interactive?: boolean;
  verbose?: boolean;
  dryRun?: boolean;
  configPath?: string;
  meta?: Record<string, unknown>;
}
