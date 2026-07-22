import { randomUUID } from 'node:crypto';
import type { Dirent } from 'node:fs';
import { access, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  SecurityFinding,
  SecurityScanReport,
  SecurityScanSummary,
} from '@mycli-cli/enterprise-core';

const SECRET_PATTERNS: Array<{ id: string; pattern: RegExp; title: string }> = [
  {
    id: 'aws-key',
    pattern: /AKIA[0-9A-Z]{16}/,
    title: 'Possible AWS access key',
  },
  {
    id: 'private-key',
    pattern: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    title: 'Private key material',
  },
  {
    id: 'generic-secret',
    pattern: /(api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]{8,}['"]/i,
    title: 'Hard-coded credential-like value',
  },
];

const RISKY_LICENSES = new Set(['GPL-3.0', 'AGPL-3.0', 'SSPL-1.0', 'BUSL-1.1']);

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function walkFiles(dir: string, root: string, files: string[] = []): Promise<string[]> {
  let entries: Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(full, root, files);
    } else {
      files.push(full.slice(root.length + 1).replace(/\\/g, '/'));
    }
  }
  return files;
}

function emptySummary(): SecurityScanSummary {
  return { total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 };
}

function summarize(findings: SecurityFinding[]): SecurityScanSummary {
  const summary = emptySummary();
  summary.total = findings.length;
  for (const finding of findings) {
    summary[finding.severity] += 1;
  }
  return summary;
}

export interface SecurityScanOptions {
  cwd: string;
  projectName?: string;
  readFile?: (relativePath: string) => Promise<string>;
  listFiles?: () => Promise<string[]>;
}

/**
 * Analyzes dependencies, secrets, configuration, OWASP risks, and licenses.
 */
export class SecurityScanner {
  async scan(options: SecurityScanOptions): Promise<SecurityScanReport> {
    const cwd = options.cwd;
    const projectName = options.projectName ?? 'app';
    const listFiles = options.listFiles ?? (() => walkFiles(cwd, cwd));
    const read =
      options.readFile ??
      (async (relativePath: string) => readFile(join(cwd, relativePath), 'utf8'));

    const findings: SecurityFinding[] = [];
    findings.push(...(await this.scanConfiguration(cwd)));
    findings.push(...(await this.scanDependencies(cwd, read)));
    findings.push(...(await this.scanLicenses(cwd, read)));
    findings.push(...(await this.scanSecrets(await listFiles(), read)));
    findings.push(...(await this.scanOwasp(cwd)));

    return {
      id: randomUUID(),
      generatedAt: new Date(),
      projectName,
      findings,
      summary: summarize(findings),
    };
  }

  renderMarkdown(report: SecurityScanReport): string {
    const lines = [
      `# Security Report — ${report.projectName}`,
      '',
      `- Generated: ${report.generatedAt.toISOString()}`,
      `- Findings: ${report.summary.total}`,
      `- Critical: ${report.summary.critical}`,
      `- High: ${report.summary.high}`,
      `- Medium: ${report.summary.medium}`,
      `- Low: ${report.summary.low}`,
      `- Info: ${report.summary.info}`,
      '',
      '## Findings',
      '',
    ];

    if (report.findings.length === 0) {
      lines.push('_No security findings detected._', '');
      return lines.join('\n');
    }

    for (const finding of report.findings) {
      lines.push(`### [${finding.severity.toUpperCase()}] ${finding.title}`);
      lines.push(`- Category: ${finding.category}`);
      lines.push(`- Id: ${finding.id}`);
      if (finding.file) {
        lines.push(`- Location: ${finding.file}${finding.line ? `:${finding.line}` : ''}`);
      }
      lines.push(`- ${finding.description}`);
      if (finding.remediation) {
        lines.push(`- Remediation: ${finding.remediation}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  private async scanConfiguration(cwd: string): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];
    const hasSecurityModule =
      (await pathExists(join(cwd, 'src/security'))) ||
      (await pathExists(join(cwd, 'src/platform/security')));
    if (!hasSecurityModule) {
      findings.push({
        id: 'cfg-security-module',
        category: 'configuration',
        severity: 'medium',
        title: 'Security module not scaffolded',
        description: 'No src/security platform found in the project.',
        remediation: 'Run `my security setup` to generate headers, CORS, CSRF, and rate limiting.',
      });
    }

    const envExample = join(cwd, '.env.example');
    if (!(await pathExists(envExample))) {
      findings.push({
        id: 'cfg-env-example',
        category: 'configuration',
        severity: 'low',
        title: 'Missing .env.example',
        description: 'Documented environment template is missing.',
        remediation: 'Add .env.example with non-secret placeholders.',
      });
    }

    if (await pathExists(join(cwd, '.env'))) {
      findings.push({
        id: 'cfg-env-tracked-risk',
        category: 'configuration',
        severity: 'info',
        title: '.env present in workspace',
        description: 'Ensure .env is gitignored and never committed.',
        file: '.env',
        remediation: 'Confirm .env is listed in .gitignore.',
      });
    }

    return findings;
  }

  private async scanDependencies(
    cwd: string,
    read: (path: string) => Promise<string>,
  ): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];
    const pkgPath = join(cwd, 'package.json');
    if (!(await pathExists(pkgPath))) {
      findings.push({
        id: 'deps-no-package',
        category: 'dependencies',
        severity: 'high',
        title: 'Missing package.json',
        description: 'Cannot analyze dependencies without package.json.',
      });
      return findings;
    }

    try {
      const pkg = JSON.parse(await read('package.json')) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (Object.keys(deps).length === 0) {
        findings.push({
          id: 'deps-empty',
          category: 'dependencies',
          severity: 'info',
          title: 'No dependencies declared',
          description: 'package.json has no runtime or development dependencies.',
        });
      }
      if (!deps['@fastify/helmet'] && !deps.helmet) {
        findings.push({
          id: 'deps-helmet',
          category: 'dependencies',
          severity: 'medium',
          title: 'Security headers package missing',
          description: 'Helmet (or @fastify/helmet) is not listed in dependencies.',
          remediation: 'Run `my security setup` to install header middleware.',
        });
      }
    } catch {
      findings.push({
        id: 'deps-parse-error',
        category: 'dependencies',
        severity: 'high',
        title: 'Invalid package.json',
        description: 'package.json could not be parsed as JSON.',
        file: 'package.json',
      });
    }

    return findings;
  }

  private async scanLicenses(
    cwd: string,
    read: (path: string) => Promise<string>,
  ): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];
    if (!(await pathExists(join(cwd, 'package.json')))) return findings;

    try {
      const pkg = JSON.parse(await read('package.json')) as {
        license?: string;
        dependencies?: Record<string, string>;
      };
      if (!pkg.license) {
        findings.push({
          id: 'license-missing',
          category: 'licenses',
          severity: 'low',
          title: 'Project license not declared',
          description: 'package.json does not declare a license field.',
          file: 'package.json',
          remediation: 'Add an SPDX license identifier to package.json.',
        });
      } else if (RISKY_LICENSES.has(pkg.license)) {
        findings.push({
          id: 'license-restrictive',
          category: 'licenses',
          severity: 'medium',
          title: `Restrictive license: ${pkg.license}`,
          description: 'Project license may impose strong copyleft or commercial restrictions.',
          file: 'package.json',
        });
      }

      // Lightweight license note for known problematic dep names in package.json ranges
      for (const name of Object.keys(pkg.dependencies ?? {})) {
        if (name.includes('agpl') || name.includes('sspl')) {
          findings.push({
            id: `license-dep-${name}`,
            category: 'licenses',
            severity: 'medium',
            title: `Potentially restrictive dependency: ${name}`,
            description: 'Dependency name suggests a restrictive license family.',
            remediation: 'Review the dependency license before distribution.',
          });
        }
      }
    } catch {
      /* ignore */
    }

    return findings;
  }

  private async scanSecrets(
    files: string[],
    read: (path: string) => Promise<string>,
  ): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];
    const candidates = files.filter(
      (file) =>
        !file.endsWith('.md') &&
        !file.endsWith('.lock') &&
        !file.includes('security-report') &&
        (file.endsWith('.ts') ||
          file.endsWith('.js') ||
          file.endsWith('.json') ||
          file.endsWith('.env') ||
          file.endsWith('.yml') ||
          file.endsWith('.yaml')),
    );

    for (const file of candidates.slice(0, 200)) {
      let content: string;
      try {
        content = await read(file);
      } catch {
        continue;
      }
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i] ?? '';
        for (const rule of SECRET_PATTERNS) {
          if (rule.pattern.test(line)) {
            findings.push({
              id: `secret-${rule.id}-${file}-${i + 1}`,
              category: 'secrets',
              severity: 'high',
              title: rule.title,
              description: `Pattern matched in ${file}`,
              file,
              line: i + 1,
              remediation: 'Remove the secret and rotate credentials.',
            });
          }
        }
      }
    }

    return findings;
  }

  private async scanOwasp(cwd: string): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    if (!(await pathExists(join(cwd, 'src/security/csrf')))) {
      findings.push({
        id: 'owasp-csrf',
        category: 'owasp',
        severity: 'medium',
        title: 'CSRF protection not detected',
        description: 'No CSRF module found under src/security/csrf.',
        remediation: 'Run `my security setup` to add CSRF protection.',
      });
    }

    if (!(await pathExists(join(cwd, 'src/security/validation')))) {
      findings.push({
        id: 'owasp-validation',
        category: 'owasp',
        severity: 'medium',
        title: 'Input validation module missing',
        description: 'OWASP A03: Injection — add schema validation for untrusted input.',
        remediation: 'Run `my security setup` to generate Zod-based validators.',
      });
    }

    if (!(await pathExists(join(cwd, 'src/security/sanitization')))) {
      findings.push({
        id: 'owasp-xss',
        category: 'owasp',
        severity: 'medium',
        title: 'Output sanitization module missing',
        description: 'OWASP A03/A05 — sanitize untrusted HTML/user content.',
        remediation: 'Run `my security setup` to generate sanitization helpers.',
      });
    }

    return findings;
  }
}

export function createSecurityScanner(): SecurityScanner {
  return new SecurityScanner();
}
