/**
 * Enterprise project health analysis contracts (Phase 18).
 */
export type HealthCategory =
  | 'architecture'
  | 'security'
  | 'dependencies'
  | 'testing'
  | 'documentation'
  | 'deployment'
  | 'performance';

export type HealthStatus = 'pass' | 'warn' | 'fail' | 'info';

export interface HealthFinding {
  id: string;
  category: HealthCategory;
  status: HealthStatus;
  title: string;
  message: string;
  recommendation?: string;
}

export interface ProjectHealthSummary {
  pass: number;
  warn: number;
  fail: number;
  info: number;
}

export interface ProjectHealthReport {
  id: string;
  generatedAt: Date;
  projectName: string;
  findings: HealthFinding[];
  summary: ProjectHealthSummary;
  /** 0–100 overall health score */
  score: number;
  readyForProduction: boolean;
}

export interface ProjectHealthAnalyzeOptions {
  cwd?: string;
  projectName?: string;
  dryRun?: boolean;
  categories?: HealthCategory[];
  outputFile?: string;
}
