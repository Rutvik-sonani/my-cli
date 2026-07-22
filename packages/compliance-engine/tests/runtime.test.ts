import { describe, expect, it } from 'vitest';
import { normalizeComplianceFramework, normalizeComplianceFrameworks } from '../src/config.js';
import {
  ComplianceService,
  createDefaultComplianceService,
} from '../src/runtime/compliance-service.js';

describe('ComplianceService', () => {
  it('runs checks only for selected frameworks', () => {
    const service = createDefaultComplianceService(['gdpr', 'soc2']);
    const checks = service.runChecks();
    expect(checks.every((check) => check.framework === 'gdpr' || check.framework === 'soc2')).toBe(
      true,
    );
    expect(checks.some((check) => check.id.startsWith('gdpr-'))).toBe(true);
    expect(checks.some((check) => check.id.startsWith('soc2-'))).toBe(true);
    expect(checks.some((check) => check.framework === 'hipaa')).toBe(false);
  });

  it('generates reports with summary and markdown', () => {
    const service = new ComplianceService(['gdpr']);
    service.setCheckStatus('gdpr-retention', 'pass');
    const report = service.generateReport();
    expect(report.summary.pass).toBeGreaterThanOrEqual(1);
    expect(report.frameworks).toEqual(['gdpr']);

    const markdown = service.renderMarkdownReport(report);
    expect(markdown).toContain('# Compliance Report');
    expect(markdown).toContain('gdpr-retention');
  });

  it('lists retention rules and policies for frameworks', () => {
    const service = createDefaultComplianceService(['hipaa', 'iso27001']);
    expect(service.listRetentionRules().some((rule) => rule.framework === 'hipaa')).toBe(true);
    expect(service.listPolicies().map((policy) => policy.framework)).toEqual(
      expect.arrayContaining(['hipaa', 'iso27001']),
    );
  });
});

describe('compliance config', () => {
  it('normalizes frameworks', () => {
    expect(normalizeComplianceFramework('GDPR')).toBe('gdpr');
    expect(normalizeComplianceFramework('soc-2')).toBe('soc2');
    expect(normalizeComplianceFramework('iso-27001')).toBe('iso27001');
    expect(normalizeComplianceFramework('unknown')).toBeNull();
    expect(normalizeComplianceFrameworks('gdpr, soc2 + hipaa')).toEqual(['gdpr', 'soc2', 'hipaa']);
  });
});
