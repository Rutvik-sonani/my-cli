import { randomUUID } from 'node:crypto';
import type {
  HealthCategory,
  HealthFinding,
  ProjectHealthReport,
  ProjectHealthSummary,
} from '@mycli-cli/enterprise-core';
import { type FileSystem, createFileSystem } from '@mycli-cli/filesystem';
import { ALL_HEALTH_CATEGORIES, HEALTH_REPORT_FILE } from '../config.js';

export interface ProjectSnapshot {
  projectName: string;
  architectureStyle?: string;
  database?: string;
  features: Record<string, boolean>;
  scripts: Record<string, string>;
  dependencyCount: number;
  existingPaths: string[];
}

export interface AnalyzeRuntimeOptions {
  cwd?: string;
  projectName?: string;
  categories?: HealthCategory[];
  snapshot?: ProjectSnapshot;
  dryRun?: boolean;
  outputFile?: string;
}

function emptySummary(): ProjectHealthSummary {
  return { pass: 0, warn: 0, fail: 0, info: 0 };
}

function summarize(findings: HealthFinding[]): ProjectHealthSummary {
  const summary = emptySummary();
  for (const finding of findings) {
    summary[finding.status] += 1;
  }
  return summary;
}

function computeScore(summary: ProjectHealthSummary): number {
  const total = summary.pass + summary.warn + summary.fail + summary.info;
  if (total === 0) return 100;
  const raw =
    (summary.pass * 100 + summary.info * 85 + summary.warn * 55 + summary.fail * 15) / total;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/**
 * Analyzes enterprise project health across architecture, security, testing, etc.
 */
export class ProjectHealthAnalyzer {
  private readonly fs: FileSystem;

  constructor(options: { cwd?: string; filesystem?: FileSystem } = {}) {
    const cwd = options.cwd ?? process.cwd();
    this.fs = options.filesystem ?? createFileSystem(cwd);
  }

  async analyze(options: AnalyzeRuntimeOptions = {}): Promise<{
    report: ProjectHealthReport;
    reportPath: string;
    markdown: string;
  }> {
    const snapshot =
      options.snapshot ??
      (await this.loadSnapshot(options.cwd ?? this.fs.getRoot(), options.projectName));
    const categories = options.categories?.length ? options.categories : [...ALL_HEALTH_CATEGORIES];

    const findings: HealthFinding[] = [];
    if (categories.includes('architecture')) findings.push(...this.analyzeArchitecture(snapshot));
    if (categories.includes('security')) findings.push(...this.analyzeSecurity(snapshot));
    if (categories.includes('dependencies')) findings.push(...this.analyzeDependencies(snapshot));
    if (categories.includes('testing')) findings.push(...this.analyzeTesting(snapshot));
    if (categories.includes('documentation')) findings.push(...this.analyzeDocumentation(snapshot));
    if (categories.includes('deployment')) findings.push(...this.analyzeDeployment(snapshot));
    if (categories.includes('performance')) findings.push(...this.analyzePerformance(snapshot));

    const summary = summarize(findings);
    const score = computeScore(summary);
    const report: ProjectHealthReport = {
      id: randomUUID(),
      generatedAt: new Date(),
      projectName: snapshot.projectName,
      findings,
      summary,
      score,
      readyForProduction: summary.fail === 0 && score >= 70,
    };

    const markdown = this.renderMarkdown(report);
    const reportPath = options.outputFile ?? HEALTH_REPORT_FILE;
    if (!options.dryRun) {
      await this.fs.write(reportPath, markdown);
    }

    return { report, reportPath, markdown };
  }

  renderMarkdown(report: ProjectHealthReport): string {
    const lines = [
      `# Project Health Report — ${report.projectName}`,
      '',
      `- Generated: ${report.generatedAt.toISOString()}`,
      `- Score: **${report.score}/100**`,
      `- Production ready: ${report.readyForProduction ? 'yes' : 'no'}`,
      `- Pass: ${report.summary.pass}`,
      `- Warn: ${report.summary.warn}`,
      `- Fail: ${report.summary.fail}`,
      `- Info: ${report.summary.info}`,
      '',
      '## Findings',
      '',
    ];

    const byCategory = new Map<HealthCategory, HealthFinding[]>();
    for (const finding of report.findings) {
      const list = byCategory.get(finding.category) ?? [];
      list.push(finding);
      byCategory.set(finding.category, list);
    }

    for (const category of ALL_HEALTH_CATEGORIES) {
      const items = byCategory.get(category);
      if (!items?.length) continue;
      lines.push(`### ${category.charAt(0).toUpperCase()}${category.slice(1)}`);
      lines.push('');
      for (const finding of items) {
        const mark =
          finding.status === 'pass'
            ? '✔'
            : finding.status === 'fail'
              ? '✘'
              : finding.status === 'warn'
                ? '⚠'
                : 'ℹ';
        lines.push(`- ${mark} **${finding.title}** (${finding.status}): ${finding.message}`);
        if (finding.recommendation) {
          lines.push(`  - Recommendation: ${finding.recommendation}`);
        }
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  private analyzeArchitecture(snapshot: ProjectSnapshot): HealthFinding[] {
    const findings: HealthFinding[] = [];
    if (snapshot.architectureStyle) {
      findings.push({
        id: 'arch-style',
        category: 'architecture',
        status: 'pass',
        title: 'Architecture style configured',
        message: `Using \`${snapshot.architectureStyle}\`.`,
      });
    } else {
      findings.push({
        id: 'arch-style',
        category: 'architecture',
        status: 'warn',
        title: 'Architecture style missing',
        message: 'No architectureStyle in project config.',
        recommendation:
          'Set architecture with `my create --architecture-style …` or update `.myclirc.json`.',
      });
    }

    const hasRules =
      snapshot.existingPaths.includes('.architecture/dependency-rules.json') ||
      snapshot.existingPaths.includes('.architecture');
    findings.push({
      id: 'arch-boundaries',
      category: 'architecture',
      status: hasRules ? 'pass' : 'warn',
      title: 'Module boundaries',
      message: hasRules
        ? 'Architecture dependency rules present.'
        : 'No `.architecture` dependency rules found.',
      recommendation: hasRules
        ? undefined
        : 'Run architecture setup or regenerate with an enterprise architecture style.',
    });

    return findings;
  }

  private analyzeSecurity(snapshot: ProjectSnapshot): HealthFinding[] {
    const findings: HealthFinding[] = [];
    const hasSecurity =
      Boolean(snapshot.features.security) || snapshot.existingPaths.includes('src/security');
    findings.push({
      id: 'sec-platform',
      category: 'security',
      status: hasSecurity ? 'pass' : 'fail',
      title: 'Security platform',
      message: hasSecurity
        ? 'Security platform enabled or present.'
        : 'Security platform not detected.',
      recommendation: hasSecurity ? undefined : 'Run `my security setup` or `my add security`.',
    });

    const hasSecurityDoc = snapshot.existingPaths.includes('SECURITY.md');
    findings.push({
      id: 'sec-docs',
      category: 'security',
      status: hasSecurityDoc ? 'pass' : 'warn',
      title: 'Security documentation',
      message: hasSecurityDoc ? 'SECURITY.md present.' : 'SECURITY.md missing.',
      recommendation: hasSecurityDoc ? undefined : 'Add SECURITY.md or run `my security setup`.',
    });

    const hasAuth =
      Boolean(snapshot.features.auth) || Boolean(snapshot.features['enterprise-auth']);
    findings.push({
      id: 'sec-auth',
      category: 'security',
      status: hasAuth ? 'pass' : 'warn',
      title: 'Authentication',
      message: hasAuth ? 'Auth feature enabled.' : 'No auth feature enabled.',
      recommendation: hasAuth ? undefined : 'Run `my add auth` or `my add enterprise-auth`.',
    });

    return findings;
  }

  private analyzeDependencies(snapshot: ProjectSnapshot): HealthFinding[] {
    const findings: HealthFinding[] = [];
    const hasPackage = snapshot.existingPaths.includes('package.json');
    findings.push({
      id: 'deps-package',
      category: 'dependencies',
      status: hasPackage ? 'pass' : 'fail',
      title: 'package.json',
      message: hasPackage
        ? `Found (${snapshot.dependencyCount} runtime dependencies).`
        : 'package.json missing.',
    });

    const hasLock =
      snapshot.existingPaths.includes('pnpm-lock.yaml') ||
      snapshot.existingPaths.includes('package-lock.json') ||
      snapshot.existingPaths.includes('yarn.lock');
    findings.push({
      id: 'deps-lockfile',
      category: 'dependencies',
      status: hasLock ? 'pass' : 'warn',
      title: 'Lockfile',
      message: hasLock ? 'Dependency lockfile present.' : 'No lockfile detected.',
      recommendation: hasLock ? undefined : 'Commit a lockfile for reproducible installs.',
    });

    if (snapshot.dependencyCount > 80) {
      findings.push({
        id: 'deps-size',
        category: 'dependencies',
        status: 'warn',
        title: 'Large dependency surface',
        message: `${snapshot.dependencyCount} runtime dependencies may increase supply-chain risk.`,
        recommendation: 'Audit unused packages and prefer workspace/shared libraries.',
      });
    } else if (hasPackage) {
      findings.push({
        id: 'deps-size',
        category: 'dependencies',
        status: 'info',
        title: 'Dependency surface',
        message: `${snapshot.dependencyCount} runtime dependencies.`,
      });
    }

    return findings;
  }

  private analyzeTesting(snapshot: ProjectSnapshot): HealthFinding[] {
    const findings: HealthFinding[] = [];
    const hasScript = Boolean(snapshot.scripts.test);
    const hasTestsDir =
      snapshot.existingPaths.includes('tests') || snapshot.existingPaths.includes('src');
    const hasTestingFeature = Boolean(snapshot.features.testing);

    if (hasScript || hasTestingFeature || snapshot.existingPaths.includes('tests')) {
      findings.push({
        id: 'test-suite',
        category: 'testing',
        status: 'pass',
        title: 'Automated tests',
        message: hasScript
          ? 'Test script configured.'
          : hasTestingFeature
            ? 'Testing feature enabled.'
            : 'tests/ directory present.',
      });
    } else {
      findings.push({
        id: 'test-suite',
        category: 'testing',
        status: 'fail',
        title: 'Automated tests',
        message: 'No test script, testing feature, or tests/ directory.',
        recommendation: 'Run `my add testing` and add unit/integration coverage.',
      });
    }

    if (!hasScript && (hasTestingFeature || snapshot.existingPaths.includes('tests'))) {
      findings.push({
        id: 'test-script',
        category: 'testing',
        status: 'warn',
        title: 'Test script',
        message: 'Tests may exist but package.json has no `test` script.',
        recommendation: 'Add a `test` script (e.g. vitest run).',
      });
    }

    void hasTestsDir;
    return findings;
  }

  private analyzeDocumentation(snapshot: ProjectSnapshot): HealthFinding[] {
    const docs = [
      { path: 'README.md', id: 'doc-readme', required: true },
      { path: 'ENVIRONMENT.md', id: 'doc-env', required: false },
      { path: 'ARCHITECTURE.md', id: 'doc-arch', required: false },
      { path: 'SECURITY.md', id: 'doc-security', required: false },
    ];

    return docs.map((doc) => {
      const present = snapshot.existingPaths.includes(doc.path);
      return {
        id: doc.id,
        category: 'documentation' as const,
        status: present ? ('pass' as const) : doc.required ? ('fail' as const) : ('warn' as const),
        title: doc.path,
        message: present ? `${doc.path} present.` : `${doc.path} missing.`,
        recommendation: present
          ? undefined
          : `Add ${doc.path} for team onboarding and ops clarity.`,
      };
    });
  }

  private analyzeDeployment(snapshot: ProjectSnapshot): HealthFinding[] {
    const findings: HealthFinding[] = [];
    const hasDocker =
      Boolean(snapshot.features.docker) ||
      snapshot.existingPaths.includes('Dockerfile') ||
      snapshot.existingPaths.includes('docker-compose.yml');
    findings.push({
      id: 'deploy-docker',
      category: 'deployment',
      status: hasDocker ? 'pass' : 'warn',
      title: 'Containerization',
      message: hasDocker ? 'Docker packaging detected.' : 'No Docker packaging detected.',
      recommendation: hasDocker ? undefined : 'Run `my add docker`.',
    });

    const hasCicd =
      Boolean(snapshot.features.cicd) ||
      Boolean(snapshot.features.github) ||
      snapshot.existingPaths.includes('.github/workflows') ||
      snapshot.existingPaths.includes('.gitlab-ci.yml');
    findings.push({
      id: 'deploy-cicd',
      category: 'deployment',
      status: hasCicd ? 'pass' : 'fail',
      title: 'CI/CD',
      message: hasCicd ? 'CI/CD configuration detected.' : 'No CI/CD workflows detected.',
      recommendation: hasCicd
        ? undefined
        : 'Add GitHub Actions / GitLab CI or run `my add github`.',
    });

    const hasDeploy =
      Boolean(snapshot.features.deploy) ||
      snapshot.existingPaths.includes('DEPLOY.md') ||
      snapshot.existingPaths.includes('DEPLOYMENT.md') ||
      snapshot.existingPaths.includes('k8s') ||
      snapshot.existingPaths.includes('helm');
    findings.push({
      id: 'deploy-config',
      category: 'deployment',
      status: hasDeploy ? 'pass' : 'warn',
      title: 'Deployment config',
      message: hasDeploy
        ? 'Deployment configuration present.'
        : 'No cloud/deploy configuration detected.',
      recommendation: hasDeploy ? undefined : 'Run `my deploy setup` or add Kubernetes/Helm.',
    });

    return findings;
  }

  private analyzePerformance(snapshot: ProjectSnapshot): HealthFinding[] {
    const findings: HealthFinding[] = [];
    const hasObs =
      Boolean(snapshot.features.observability) ||
      snapshot.existingPaths.includes('src/observability') ||
      snapshot.existingPaths.includes('src/platform/observability');
    findings.push({
      id: 'perf-observability',
      category: 'performance',
      status: hasObs ? 'pass' : 'warn',
      title: 'Observability',
      message: hasObs
        ? 'Observability platform detected.'
        : 'No observability/logging/metrics platform detected.',
      recommendation: hasObs
        ? undefined
        : 'Run `my add observability` for logs, metrics, and tracing.',
    });

    const hasCache =
      Boolean(snapshot.features.cache) || snapshot.existingPaths.includes('src/services/cache');
    findings.push({
      id: 'perf-cache',
      category: 'performance',
      status: hasCache ? 'pass' : 'info',
      title: 'Caching',
      message: hasCache ? 'Cache service detected.' : 'No cache service detected (optional).',
      recommendation: hasCache ? undefined : 'Consider `my add cache` for hot-path reads.',
    });

    if (snapshot.dependencyCount > 100) {
      findings.push({
        id: 'perf-deps',
        category: 'performance',
        status: 'warn',
        title: 'Dependency weight',
        message: 'Large dependency graph can slow cold starts and builds.',
        recommendation: 'Trim unused packages and enable tree-shaking where possible.',
      });
    }

    return findings;
  }

  private async loadSnapshot(cwd: string, projectName?: string): Promise<ProjectSnapshot> {
    const fs = createFileSystem(cwd);
    let name = projectName ?? 'app';
    let architectureStyle: string | undefined;
    let database: string | undefined;
    let features: Record<string, boolean> = {};
    let scripts: Record<string, string> = {};
    let dependencyCount = 0;

    try {
      const config = await fs.readJson<{
        projectName?: string;
        architectureStyle?: string;
        database?: string;
        features?: Record<string, boolean>;
      }>('.myclirc.json');
      name = config.projectName ?? name;
      architectureStyle = config.architectureStyle;
      database = config.database;
      features = config.features ?? {};
    } catch {
      /* optional */
    }

    try {
      const pkg = await fs.readJson<{
        scripts?: Record<string, string>;
        dependencies?: Record<string, string>;
      }>('package.json');
      scripts = pkg.scripts ?? {};
      dependencyCount = Object.keys(pkg.dependencies ?? {}).length;
    } catch {
      /* optional */
    }

    const candidates = [
      'package.json',
      'pnpm-lock.yaml',
      'package-lock.json',
      'yarn.lock',
      'README.md',
      'ENVIRONMENT.md',
      'ARCHITECTURE.md',
      'SECURITY.md',
      'Dockerfile',
      'docker-compose.yml',
      '.github/workflows',
      '.gitlab-ci.yml',
      'DEPLOY.md',
      'DEPLOYMENT.md',
      'k8s',
      'helm',
      'tests',
      'src',
      'src/security',
      'src/observability',
      'src/platform/observability',
      'src/services/cache',
      '.architecture',
      '.architecture/dependency-rules.json',
    ];

    const existingPaths: string[] = [];
    for (const candidate of candidates) {
      if (await fs.exists(candidate)) existingPaths.push(candidate);
    }

    return {
      projectName: name,
      architectureStyle,
      database,
      features,
      scripts,
      dependencyCount,
      existingPaths,
    };
  }
}

export function createProjectHealthAnalyzer(options?: {
  cwd?: string;
  filesystem?: FileSystem;
}): ProjectHealthAnalyzer {
  return new ProjectHealthAnalyzer(options);
}
