import { join } from 'node:path';
import { type FileSystem, createFileSystem } from '@mycli-cli/filesystem';
import { type TemplateEngine, createTemplateEngine } from '@mycli-cli/template-engine';
import {
  type GovernancePathConfig,
  createDefaultCompanyPolicy,
  getGovernanceEnvLines,
  resolveGovernancePaths,
} from './config.js';
import { createGovernanceService } from './runtime/governance-service.js';

export interface GovernanceSetupOptions {
  appName: string;
  company?: string;
  cwd?: string;
  dryRun?: boolean;
  paths?: GovernancePathConfig;
  language?: 'typescript' | 'javascript';
}

export interface GovernanceSetupResult {
  files: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export interface GovernanceCheckCliOptions {
  cwd?: string;
  projectName?: string;
  company?: string;
  outputFile?: string;
  dryRun?: boolean;
}

export interface GovernanceCheckCliResult {
  reportPath: string;
  markdown: string;
  compliant: boolean;
  failCount: number;
}

interface TemplateFile {
  template: string;
  out: (paths: ReturnType<typeof resolveGovernancePaths>) => string;
}

const SETUP_FILES: TemplateFile[] = [
  {
    template: 'features/governance/governance.types.ts.ejs',
    out: (p) => join(p.root, 'governance.types.ts'),
  },
  {
    template: 'features/governance/policy/company-policy.ts.ejs',
    out: (p) => join(p.policy, 'company-policy.ts'),
  },
  {
    template: 'features/governance/rules/default-rules.ts.ejs',
    out: (p) => join(p.rules, 'default-rules.ts'),
  },
  {
    template: 'features/governance/checker/governance.checker.ts.ejs',
    out: (p) => join(p.checker, 'governance.checker.ts'),
  },
  {
    template: 'features/governance/governance.service.ts.ejs',
    out: (p) => join(p.root, 'governance.service.ts'),
  },
  {
    template: 'features/governance/register-governance.ts.ejs',
    out: (p) => join(p.root, 'register-governance.ts'),
  },
  {
    template: 'features/governance/index.ts.ejs',
    out: (p) => join(p.root, 'index.ts'),
  },
  {
    template: 'features/governance/tests/governance.test.ts.ejs',
    out: () => join('tests', 'governance', 'governance.test.ts'),
  },
];

/**
 * Scaffolds company governance policy and runs compliance checks.
 */
export class GovernanceManager {
  private readonly fs: FileSystem;
  private readonly templates: TemplateEngine;

  constructor(
    options: {
      cwd?: string;
      filesystem?: FileSystem;
      templateEngine?: TemplateEngine;
      templatesRoot?: string;
    } = {},
  ) {
    const cwd = options.cwd ?? process.cwd();
    this.fs = options.filesystem ?? createFileSystem(cwd);
    this.templates =
      options.templateEngine ??
      createTemplateEngine({
        filesystem: this.fs,
        templatesRoot: options.templatesRoot ?? 'templates',
      });
  }

  async setup(options: GovernanceSetupOptions): Promise<GovernanceSetupResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const paths = resolveGovernancePaths(options.paths);
    const language = options.language ?? 'typescript';
    const company = options.company ?? options.appName;
    const policy = createDefaultCompanyPolicy(company);
    const templateData = {
      appName: options.appName,
      company,
      language,
      paths,
      policy,
    } as Record<string, unknown>;

    const written: string[] = [];
    for (const file of SETUP_FILES) {
      const outPath = file.out(paths);
      const content = await this.templates.renderFile(file.template, { data: templateData });
      if (!options.dryRun) {
        await fs.write(outPath, content);
      }
      written.push(outPath);
    }

    const policyJson = `${JSON.stringify(policy, null, 2)}\n`;
    if (!options.dryRun) {
      await fs.write('company-policy.json', policyJson);
    }
    written.push('company-policy.json');

    const docContent = await this.templates.renderFile('features/governance/GOVERNANCE.md.ejs', {
      data: templateData,
    });
    if (!options.dryRun) {
      await fs.write('GOVERNANCE.md', docContent);
      const envSection = `# GOVERNANCE\n${getGovernanceEnvLines(options.appName).join('\n')}\n`;
      await fs.append('.env.example', `\n${envSection}`);
    }
    written.push('GOVERNANCE.md', '.env.example');

    return {
      files: written,
      dependencies: {},
      devDependencies: {},
    };
  }

  async check(options: GovernanceCheckCliOptions = {}): Promise<GovernanceCheckCliResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const company = options.company ?? options.projectName ?? 'Company';
    const service = createGovernanceService(company);
    const checker = service.createChecker();
    const report = await checker.check({
      cwd,
      projectName: options.projectName ?? company,
    });
    const markdown = checker.renderMarkdown(report);
    const reportPath = options.outputFile ?? 'GOVERNANCE_REPORT.md';
    if (!options.dryRun) {
      await fs.write(reportPath, markdown);
    }
    return {
      reportPath,
      markdown,
      compliant: report.compliant,
      failCount: report.summary.fail,
    };
  }
}

export function createGovernanceManager(options?: {
  cwd?: string;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
}): GovernanceManager {
  return new GovernanceManager(options);
}
