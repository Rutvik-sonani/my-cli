import { join } from 'node:path';
import type { ComplianceFramework } from '@mycli-cli/enterprise-core';

export interface CompliancePathConfig {
  compliance?: string;
}

export interface CompliancePaths {
  root: string;
  policies: string;
  checks: string;
  reports: string;
  documentation: string;
}

export function resolveCompliancePaths(config: CompliancePathConfig = {}): CompliancePaths {
  const root = config.compliance ?? 'src/compliance';

  return {
    root,
    policies: join(root, 'policies'),
    checks: join(root, 'checks'),
    reports: join(root, 'reports'),
    documentation: join(root, 'documentation'),
  };
}

export const COMPLIANCE_FRAMEWORKS: ComplianceFramework[] = ['gdpr', 'hipaa', 'soc2', 'iso27001'];

export function normalizeComplianceFramework(input: string): ComplianceFramework | null {
  const value = input.toLowerCase().replace(/_/g, '-');
  if (value === 'iso-27001' || value === 'iso') return 'iso27001';
  if (value === 'soc-2' || value === 'soc') return 'soc2';
  return COMPLIANCE_FRAMEWORKS.includes(value as ComplianceFramework)
    ? (value as ComplianceFramework)
    : null;
}

export function normalizeComplianceFrameworks(input: string): ComplianceFramework[] {
  const parts = input
    .split(/[,+\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const frameworks: ComplianceFramework[] = [];
  for (const part of parts) {
    const normalized = normalizeComplianceFramework(part);
    if (normalized && !frameworks.includes(normalized)) {
      frameworks.push(normalized);
    }
  }
  return frameworks;
}

export function getComplianceEnvLines(
  appName: string,
  frameworks: ComplianceFramework[],
): string[] {
  return [
    `COMPLIANCE_APP=${appName}`,
    `COMPLIANCE_FRAMEWORKS=${frameworks.join(',')}`,
    'COMPLIANCE_ENABLED=true',
    'COMPLIANCE_RETENTION_DEFAULT_DAYS=365',
  ];
}

export function policyTemplateFile(framework: ComplianceFramework): string {
  return `features/compliance/policies/${framework}.policy.ts.ejs`;
}

export function frameworkLabel(framework: ComplianceFramework): string {
  switch (framework) {
    case 'gdpr':
      return 'GDPR';
    case 'hipaa':
      return 'HIPAA';
    case 'soc2':
      return 'SOC 2';
    case 'iso27001':
      return 'ISO 27001';
  }
}
