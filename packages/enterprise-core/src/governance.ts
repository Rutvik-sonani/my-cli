/**
 * Company governance contracts (Phase 15).
 */
export type GovernanceRuleCategory =
  | 'database'
  | 'authentication'
  | 'security'
  | 'documentation'
  | 'cicd'
  | 'testing'
  | 'infrastructure'
  | 'audit';

export type GovernanceCheckStatus = 'pass' | 'fail' | 'warning' | 'skipped';

export interface GovernanceRule {
  id: string;
  category: GovernanceRuleCategory;
  title: string;
  description: string;
  required: boolean;
  /** Feature flag key in .myclirc.json features */
  featureKey?: string;
  /** Expected config field/value hints */
  expect?: {
    database?: string;
    pathExists?: string[];
    packageScripts?: string[];
  };
}

export interface GovernancePolicy {
  id: string;
  name: string;
  version: string;
  company: string;
  rules: GovernanceRule[];
}

export interface GovernanceCheckResult {
  ruleId: string;
  status: GovernanceCheckStatus;
  title: string;
  message: string;
  evidence?: string;
}

export interface GovernanceReportSummary {
  pass: number;
  fail: number;
  warning: number;
  skipped: number;
}

export interface GovernanceReport {
  id: string;
  policyId: string;
  generatedAt: Date;
  projectName: string;
  results: GovernanceCheckResult[];
  summary: GovernanceReportSummary;
  compliant: boolean;
}
