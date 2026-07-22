/**
 * Compliance engine contracts (Phase 8).
 */
export type ComplianceFramework = 'gdpr' | 'hipaa' | 'soc2' | 'iso27001';

export type ComplianceCheckStatus = 'pass' | 'fail' | 'warning' | 'not-applicable';

export interface ComplianceCheck {
  id: string;
  framework: ComplianceFramework;
  category: string;
  title: string;
  description: string;
  status: ComplianceCheckStatus;
  evidence?: string;
}

export interface DataRetentionRule {
  id: string;
  dataCategory: string;
  retentionDays: number;
  legalBasis?: string;
  framework: ComplianceFramework;
}

export interface CompliancePolicy {
  id: string;
  framework: ComplianceFramework;
  name: string;
  version: string;
  summary: string;
}

export interface ComplianceReportSummary {
  pass: number;
  fail: number;
  warning: number;
  notApplicable: number;
}

export interface ComplianceReport {
  id: string;
  frameworks: ComplianceFramework[];
  generatedAt: Date;
  checks: ComplianceCheck[];
  summary: ComplianceReportSummary;
}
