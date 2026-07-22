import { randomUUID } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  GovernanceCheckResult,
  GovernancePolicy,
  GovernanceReport,
  GovernanceReportSummary,
  GovernanceRule,
} from '@mycli/enterprise-core';
import { createDefaultCompanyPolicy } from '../config.js';

export interface ProjectSnapshot {
  projectName: string;
  database?: string;
  features: Record<string, boolean>;
  scripts: Record<string, string>;
  existingPaths: string[];
}

export interface GovernanceCheckOptions {
  cwd: string;
  projectName?: string;
  policy?: GovernancePolicy;
  snapshot?: ProjectSnapshot;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function emptySummary(): GovernanceReportSummary {
  return { pass: 0, fail: 0, warning: 0, skipped: 0 };
}

function summarize(results: GovernanceCheckResult[]): GovernanceReportSummary {
  const summary = emptySummary();
  for (const result of results) {
    summary[result.status] += 1;
  }
  return summary;
}

/**
 * Evaluates company governance policy against a project snapshot.
 */
export class GovernanceChecker {
  constructor(private readonly policy: GovernancePolicy) {}

  getPolicy(): GovernancePolicy {
    return this.policy;
  }

  async check(options: GovernanceCheckOptions): Promise<GovernanceReport> {
    const snapshot =
      options.snapshot ?? (await this.loadSnapshot(options.cwd, options.projectName));
    const results = this.policy.rules.map((rule) => this.evaluateRule(rule, snapshot));
    const summary = summarize(results);
    const requiredFailed = results.some(
      (result, index) => this.policy.rules[index]?.required && result.status === 'fail',
    );

    return {
      id: randomUUID(),
      policyId: this.policy.id,
      generatedAt: new Date(),
      projectName: snapshot.projectName,
      results,
      summary,
      compliant: !requiredFailed,
    };
  }

  renderMarkdown(report: GovernanceReport): string {
    const lines = [
      `# Governance Report — ${report.projectName}`,
      '',
      `- Policy: ${report.policyId}`,
      `- Generated: ${report.generatedAt.toISOString()}`,
      `- Compliant: ${report.compliant ? 'yes' : 'no'}`,
      `- Pass: ${report.summary.pass}`,
      `- Fail: ${report.summary.fail}`,
      `- Warning: ${report.summary.warning}`,
      `- Skipped: ${report.summary.skipped}`,
      '',
      '## Checklist',
      '',
    ];

    for (const result of report.results) {
      const mark =
        result.status === 'pass'
          ? '✔'
          : result.status === 'fail'
            ? '✘'
            : result.status === 'warning'
              ? '⚠'
              : '–';
      lines.push(`- ${mark} **${result.title}** (${result.status}): ${result.message}`);
      if (result.evidence) lines.push(`  - Evidence: ${result.evidence}`);
    }
    lines.push('');
    return lines.join('\n');
  }

  private evaluateRule(rule: GovernanceRule, snapshot: ProjectSnapshot): GovernanceCheckResult {
    const failures: string[] = [];
    const evidence: string[] = [];

    if (rule.expect?.database) {
      if (snapshot.database === rule.expect.database) {
        evidence.push(`database=${snapshot.database}`);
      } else {
        failures.push(
          `expected database \`${rule.expect.database}\`, found \`${snapshot.database ?? 'none'}\``,
        );
      }
    }

    const hasAltSignals =
      Boolean(rule.featureKey) ||
      Boolean(rule.expect?.pathExists?.length) ||
      Boolean(rule.expect?.packageScripts?.length);

    if (
      hasAltSignals &&
      (rule.featureKey || rule.expect?.pathExists) &&
      rule.expect?.packageScripts
    ) {
      // OR group: feature | paths | package scripts (e.g. tests requirement)
      const featureOk = rule.featureKey ? Boolean(snapshot.features[rule.featureKey]) : false;
      const matchedPaths =
        rule.expect.pathExists?.filter((path) => snapshot.existingPaths.includes(path)) ?? [];
      const pathOk = matchedPaths.length > 0;
      const matchedScripts = rule.expect.packageScripts.filter(
        (script) => snapshot.scripts[script],
      );
      const scriptsOk = matchedScripts.length === rule.expect.packageScripts.length;

      if (featureOk || pathOk || scriptsOk) {
        if (featureOk) evidence.push(`feature:${rule.featureKey}=true`);
        if (pathOk) evidence.push(`paths:${matchedPaths.join(',')}`);
        if (scriptsOk) evidence.push(`scripts:${matchedScripts.join(',')}`);
      } else {
        failures.push(
          `missing feature \`${rule.featureKey ?? 'n/a'}\`, paths [${rule.expect.pathExists?.join(', ') ?? ''}], and scripts [${rule.expect.packageScripts.join(', ')}]`,
        );
      }
    } else {
      if (rule.expect?.packageScripts) {
        for (const script of rule.expect.packageScripts) {
          if (snapshot.scripts[script]) {
            evidence.push(`script:${script}`);
          } else {
            failures.push(`missing package script \`${script}\``);
          }
        }
      }

      if (rule.featureKey || rule.expect?.pathExists) {
        const featureOk = rule.featureKey ? Boolean(snapshot.features[rule.featureKey]) : false;
        const matchedPaths =
          rule.expect?.pathExists?.filter((path) => snapshot.existingPaths.includes(path)) ?? [];
        const pathOk = matchedPaths.length > 0;

        if (rule.featureKey && rule.expect?.pathExists) {
          if (featureOk || pathOk) {
            if (featureOk) evidence.push(`feature:${rule.featureKey}=true`);
            if (pathOk) evidence.push(`paths:${matchedPaths.join(',')}`);
          } else {
            failures.push(
              `missing feature \`${rule.featureKey}\` and paths [${rule.expect.pathExists.join(', ')}]`,
            );
          }
        } else if (rule.featureKey) {
          if (featureOk) evidence.push(`feature:${rule.featureKey}=true`);
          else failures.push(`missing feature \`${rule.featureKey}\``);
        } else if (rule.expect?.pathExists) {
          if (pathOk) evidence.push(`paths:${matchedPaths.join(',')}`);
          else failures.push(`missing one of: ${rule.expect.pathExists.join(', ')}`);
        }
      }
    }

    if (failures.length === 0) {
      return {
        ruleId: rule.id,
        status: 'pass',
        title: rule.title,
        message: rule.description,
        evidence: evidence.join('; ') || undefined,
      };
    }

    return {
      ruleId: rule.id,
      status: rule.required ? 'fail' : 'warning',
      title: rule.title,
      message: failures.join('; '),
      evidence: evidence.join('; ') || undefined,
    };
  }

  private async loadSnapshot(cwd: string, projectName?: string): Promise<ProjectSnapshot> {
    let database: string | undefined;
    let features: Record<string, boolean> = {};
    let name = projectName ?? 'app';
    let scripts: Record<string, string> = {};

    try {
      const config = JSON.parse(await readFile(join(cwd, '.myclirc.json'), 'utf8')) as {
        projectName?: string;
        database?: string;
        features?: Record<string, boolean>;
      };
      name = config.projectName ?? name;
      database = config.database;
      features = config.features ?? {};
    } catch {
      /* optional */
    }

    try {
      const pkg = JSON.parse(await readFile(join(cwd, 'package.json'), 'utf8')) as {
        scripts?: Record<string, string>;
      };
      scripts = pkg.scripts ?? {};
    } catch {
      /* optional */
    }

    const candidates = [
      'Dockerfile',
      'docker-compose.yml',
      'src/security',
      'src/audit',
      'tests',
      '.github/workflows',
      '.gitlab-ci.yml',
      'README.md',
      'SECURITY.md',
      'GOVERNANCE.md',
    ];
    const existingPaths: string[] = [];
    for (const candidate of candidates) {
      if (await pathExists(join(cwd, candidate))) existingPaths.push(candidate);
    }

    return {
      projectName: name,
      database,
      features,
      scripts,
      existingPaths,
    };
  }
}

export class GovernanceService {
  constructor(private readonly policy: GovernancePolicy = createDefaultCompanyPolicy('Company')) {}

  getPolicy(): GovernancePolicy {
    return this.policy;
  }

  listRules(): GovernanceRule[] {
    return [...this.policy.rules];
  }

  createChecker(): GovernanceChecker {
    return new GovernanceChecker(this.policy);
  }

  async checkProject(options: GovernanceCheckOptions): Promise<GovernanceReport> {
    return this.createChecker().check(options);
  }
}

export function createGovernanceService(company = 'Company'): GovernanceService {
  return new GovernanceService(createDefaultCompanyPolicy(company));
}
