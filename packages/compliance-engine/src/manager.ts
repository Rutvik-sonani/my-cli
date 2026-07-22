import { join } from 'node:path';
import type { ComplianceFramework } from '@mycli-cli/enterprise-core';
import { type FileSystem, createFileSystem } from '@mycli-cli/filesystem';
import { type TemplateEngine, createTemplateEngine } from '@mycli-cli/template-engine';
import {
  type CompliancePathConfig,
  getComplianceEnvLines,
  policyTemplateFile,
  resolveCompliancePaths,
} from './config.js';

export interface ComplianceSetupOptions {
  appName: string;
  frameworks: ComplianceFramework[];
  cwd?: string;
  dryRun?: boolean;
  paths?: CompliancePathConfig;
  language?: 'typescript' | 'javascript';
}

export interface ComplianceSetupResult {
  files: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

interface TemplateFile {
  template: string;
  out: (paths: ReturnType<typeof resolveCompliancePaths>) => string;
}

function sharedFiles(): TemplateFile[] {
  return [
    {
      template: 'features/compliance/compliance.types.ts.ejs',
      out: (p) => join(p.root, 'compliance.types.ts'),
    },
    {
      template: 'features/compliance/compliance.service.ts.ejs',
      out: (p) => join(p.root, 'compliance.service.ts'),
    },
    {
      template: 'features/compliance/checks/check-catalog.ts.ejs',
      out: (p) => join(p.checks, 'check-catalog.ts'),
    },
    {
      template: 'features/compliance/checks/compliance-checker.ts.ejs',
      out: (p) => join(p.checks, 'compliance-checker.ts'),
    },
    {
      template: 'features/compliance/reports/report-generator.ts.ejs',
      out: (p) => join(p.reports, 'report-generator.ts'),
    },
    {
      template: 'features/compliance/documentation/privacy-policy.md.ejs',
      out: (p) => join(p.documentation, 'privacy-policy.md'),
    },
    {
      template: 'features/compliance/documentation/security-checklist.md.ejs',
      out: (p) => join(p.documentation, 'security-checklist.md'),
    },
    {
      template: 'features/compliance/documentation/data-retention.md.ejs',
      out: (p) => join(p.documentation, 'data-retention.md'),
    },
    {
      template: 'features/compliance/register-compliance.ts.ejs',
      out: (p) => join(p.root, 'register-compliance.ts'),
    },
    {
      template: 'features/compliance/index.ts.ejs',
      out: (p) => join(p.root, 'index.ts'),
    },
    {
      template: 'features/compliance/tests/compliance.test.ts.ejs',
      out: () => join('tests', 'compliance', 'compliance.test.ts'),
    },
  ];
}

/**
 * Scaffolds enterprise compliance: policies, checks, reports, documentation.
 */
export class ComplianceManager {
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

  async setup(options: ComplianceSetupOptions): Promise<ComplianceSetupResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const paths = resolveCompliancePaths(options.paths);
    const frameworks = options.frameworks;
    const language = options.language ?? 'typescript';
    const templateData = {
      appName: options.appName,
      frameworks,
      language,
      paths,
      hasGdpr: frameworks.includes('gdpr'),
      hasHipaa: frameworks.includes('hipaa'),
      hasSoc2: frameworks.includes('soc2'),
      hasIso27001: frameworks.includes('iso27001'),
    } as Record<string, unknown>;

    const written: string[] = [];
    const files: TemplateFile[] = [
      ...sharedFiles(),
      ...frameworks.map(
        (framework): TemplateFile => ({
          template: policyTemplateFile(framework),
          out: (p) => join(p.policies, `${framework}.policy.ts`),
        }),
      ),
      {
        template: 'features/compliance/policies/index.ts.ejs',
        out: (p) => join(p.policies, 'index.ts'),
      },
    ];

    for (const file of files) {
      const outPath = file.out(paths);
      const content = await this.templates.renderFile(file.template, { data: templateData });
      if (!options.dryRun) {
        await fs.write(outPath, content);
      }
      written.push(outPath);
    }

    const docContent = await this.templates.renderFile('features/compliance/COMPLIANCE.md.ejs', {
      data: templateData,
    });
    if (!options.dryRun) {
      await fs.write('COMPLIANCE.md', docContent);
      const envSection = `# COMPLIANCE\n${getComplianceEnvLines(options.appName, frameworks).join('\n')}\n`;
      await fs.append('.env.example', `\n${envSection}`);
    }
    written.push('COMPLIANCE.md', '.env.example');

    return {
      files: written,
      dependencies: {},
      devDependencies: {},
    };
  }
}

export function createComplianceManager(options?: {
  cwd?: string;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
}): ComplianceManager {
  return new ComplianceManager(options);
}
