import { randomUUID } from 'node:crypto';
import type {
  ComplianceCheck,
  ComplianceCheckStatus,
  ComplianceFramework,
  CompliancePolicy,
  ComplianceReport,
  ComplianceReportSummary,
  DataRetentionRule,
} from '@mycli-cli/enterprise-core';

export interface ComplianceCatalogEntry {
  id: string;
  framework: ComplianceFramework;
  category: string;
  title: string;
  description: string;
  defaultStatus?: ComplianceCheckStatus;
}

const DEFAULT_CATALOG: ComplianceCatalogEntry[] = [
  {
    id: 'gdpr-retention',
    framework: 'gdpr',
    category: 'data-retention',
    title: 'Data retention policy documented',
    description: 'Personal data retention periods are defined and enforced.',
  },
  {
    id: 'gdpr-privacy-policy',
    framework: 'gdpr',
    category: 'privacy',
    title: 'Privacy policy published',
    description: 'A privacy policy describing processing purposes is available.',
  },
  {
    id: 'gdpr-subject-rights',
    framework: 'gdpr',
    category: 'privacy',
    title: 'Data subject rights workflow',
    description: 'Export and deletion workflows exist for subject access requests.',
  },
  {
    id: 'hipaa-access-control',
    framework: 'hipaa',
    category: 'access',
    title: 'PHI access controls',
    description: 'Access to protected health information is role-restricted.',
  },
  {
    id: 'hipaa-audit-log',
    framework: 'hipaa',
    category: 'audit',
    title: 'PHI access audit logging',
    description: 'Access to PHI is logged with actor and timestamp.',
  },
  {
    id: 'hipaa-breach',
    framework: 'hipaa',
    category: 'incident',
    title: 'Breach notification readiness',
    description: 'Incident response covers breach notification timelines.',
  },
  {
    id: 'soc2-access',
    framework: 'soc2',
    category: 'access',
    title: 'Logical access controls',
    description: 'User access is provisioned, reviewed, and revoked.',
  },
  {
    id: 'soc2-change',
    framework: 'soc2',
    category: 'change-management',
    title: 'Change management process',
    description: 'Production changes follow review and approval controls.',
  },
  {
    id: 'soc2-monitoring',
    framework: 'soc2',
    category: 'monitoring',
    title: 'System monitoring',
    description: 'Security and availability signals are monitored.',
  },
  {
    id: 'iso-isms',
    framework: 'iso27001',
    category: 'governance',
    title: 'ISMS policy',
    description: 'An information security management system policy is defined.',
  },
  {
    id: 'iso-risk',
    framework: 'iso27001',
    category: 'risk',
    title: 'Risk assessment process',
    description: 'Information security risks are assessed and treated.',
  },
  {
    id: 'iso-assets',
    framework: 'iso27001',
    category: 'assets',
    title: 'Asset inventory',
    description: 'Information assets are inventoried and classified.',
  },
];

const DEFAULT_RETENTION: DataRetentionRule[] = [
  {
    id: 'retain-account',
    dataCategory: 'account-profile',
    retentionDays: 365 * 3,
    legalBasis: 'contract',
    framework: 'gdpr',
  },
  {
    id: 'retain-logs',
    dataCategory: 'application-logs',
    retentionDays: 90,
    legalBasis: 'legitimate-interest',
    framework: 'gdpr',
  },
  {
    id: 'retain-phi',
    dataCategory: 'phi',
    retentionDays: 365 * 6,
    legalBasis: 'legal-obligation',
    framework: 'hipaa',
  },
  {
    id: 'retain-audit',
    dataCategory: 'audit-trail',
    retentionDays: 365,
    legalBasis: 'security',
    framework: 'soc2',
  },
];

const DEFAULT_POLICIES: CompliancePolicy[] = [
  {
    id: 'policy-gdpr',
    framework: 'gdpr',
    name: 'GDPR Privacy Policy',
    version: '1.0.0',
    summary: 'Lawful processing, retention, and data subject rights.',
  },
  {
    id: 'policy-hipaa',
    framework: 'hipaa',
    name: 'HIPAA Security Policy',
    version: '1.0.0',
    summary: 'PHI safeguards, access control, and breach response.',
  },
  {
    id: 'policy-soc2',
    framework: 'soc2',
    name: 'SOC 2 Control Policy',
    version: '1.0.0',
    summary: 'Trust services criteria for security and availability.',
  },
  {
    id: 'policy-iso27001',
    framework: 'iso27001',
    name: 'ISO 27001 ISMS Policy',
    version: '1.0.0',
    summary: 'Information security management system baseline.',
  },
];

function emptySummary(): ComplianceReportSummary {
  return { pass: 0, fail: 0, warning: 0, notApplicable: 0 };
}

function summarize(checks: ComplianceCheck[]): ComplianceReportSummary {
  const summary = emptySummary();
  for (const check of checks) {
    switch (check.status) {
      case 'pass':
        summary.pass += 1;
        break;
      case 'fail':
        summary.fail += 1;
        break;
      case 'warning':
        summary.warning += 1;
        break;
      case 'not-applicable':
        summary.notApplicable += 1;
        break;
    }
  }
  return summary;
}

/**
 * Runs compliance checks, retention rules, and report generation.
 */
export class ComplianceService {
  private readonly frameworks: ComplianceFramework[];
  private readonly catalog: ComplianceCatalogEntry[];
  private readonly retentionRules: DataRetentionRule[];
  private readonly policies: CompliancePolicy[];
  private readonly overrides = new Map<string, ComplianceCheckStatus>();

  constructor(
    frameworks: ComplianceFramework[],
    options: {
      catalog?: ComplianceCatalogEntry[];
      retentionRules?: DataRetentionRule[];
      policies?: CompliancePolicy[];
    } = {},
  ) {
    this.frameworks = frameworks;
    this.catalog = options.catalog ?? DEFAULT_CATALOG;
    this.retentionRules = options.retentionRules ?? DEFAULT_RETENTION;
    this.policies = options.policies ?? DEFAULT_POLICIES;
  }

  getFrameworks(): ComplianceFramework[] {
    return [...this.frameworks];
  }

  setCheckStatus(checkId: string, status: ComplianceCheckStatus): void {
    this.overrides.set(checkId, status);
  }

  listPolicies(): CompliancePolicy[] {
    return this.policies.filter((policy) => this.frameworks.includes(policy.framework));
  }

  listRetentionRules(): DataRetentionRule[] {
    return this.retentionRules.filter((rule) => this.frameworks.includes(rule.framework));
  }

  runChecks(): ComplianceCheck[] {
    return this.catalog
      .filter((entry) => this.frameworks.includes(entry.framework))
      .map((entry) => ({
        id: entry.id,
        framework: entry.framework,
        category: entry.category,
        title: entry.title,
        description: entry.description,
        status: this.overrides.get(entry.id) ?? entry.defaultStatus ?? 'warning',
      }));
  }

  generateReport(): ComplianceReport {
    const checks = this.runChecks();
    return {
      id: randomUUID(),
      frameworks: [...this.frameworks],
      generatedAt: new Date(),
      checks,
      summary: summarize(checks),
    };
  }

  renderMarkdownReport(report: ComplianceReport = this.generateReport()): string {
    const lines = [
      '# Compliance Report',
      '',
      `- Generated: ${report.generatedAt.toISOString()}`,
      `- Frameworks: ${report.frameworks.join(', ')}`,
      `- Pass: ${report.summary.pass}`,
      `- Fail: ${report.summary.fail}`,
      `- Warning: ${report.summary.warning}`,
      `- N/A: ${report.summary.notApplicable}`,
      '',
      '## Checks',
      '',
    ];
    for (const check of report.checks) {
      lines.push(
        `- [${check.status}] **${check.id}** (${check.framework}/${check.category}): ${check.title}`,
      );
    }
    lines.push('');
    return lines.join('\n');
  }
}

export function createDefaultComplianceService(
  frameworks: ComplianceFramework[],
): ComplianceService {
  return new ComplianceService(frameworks);
}
