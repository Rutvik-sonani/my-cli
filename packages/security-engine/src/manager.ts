import { join } from 'node:path';
import { type FileSystem, createFileSystem } from '@mycli/filesystem';
import { type TemplateEngine, createTemplateEngine } from '@mycli/template-engine';
import {
  type SecurityPathConfig,
  getSecurityDependencies,
  getSecurityEnvLines,
  resolveSecurityPaths,
} from './config.js';
import { createSecurityScanner } from './runtime/security-scanner.js';

export interface SecuritySetupOptions {
  appName: string;
  cwd?: string;
  dryRun?: boolean;
  paths?: SecurityPathConfig;
  language?: 'typescript' | 'javascript';
}

export interface SecuritySetupResult {
  files: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export interface SecurityScanCliOptions {
  cwd?: string;
  projectName?: string;
  outputFile?: string;
  dryRun?: boolean;
}

export interface SecurityScanCliResult {
  reportPath: string;
  markdown: string;
  findingCount: number;
}

interface TemplateFile {
  template: string;
  out: (paths: ReturnType<typeof resolveSecurityPaths>) => string;
}

const SETUP_FILES: TemplateFile[] = [
  {
    template: 'features/security/security.types.ts.ejs',
    out: (p) => join(p.root, 'security.types.ts'),
  },
  {
    template: 'features/security/headers/security-headers.ts.ejs',
    out: (p) => join(p.headers, 'security-headers.ts'),
  },
  {
    template: 'features/security/cors/cors.config.ts.ejs',
    out: (p) => join(p.cors, 'cors.config.ts'),
  },
  {
    template: 'features/security/csrf/csrf.protection.ts.ejs',
    out: (p) => join(p.csrf, 'csrf.protection.ts'),
  },
  {
    template: 'features/security/rate-limit/rate-limiter.ts.ejs',
    out: (p) => join(p.rateLimit, 'rate-limiter.ts'),
  },
  {
    template: 'features/security/sanitization/sanitize.ts.ejs',
    out: (p) => join(p.sanitization, 'sanitize.ts'),
  },
  {
    template: 'features/security/validation/validate.ts.ejs',
    out: (p) => join(p.validation, 'validate.ts'),
  },
  {
    template: 'features/security/security.plugin.ts.ejs',
    out: (p) => join(p.root, 'security.plugin.ts'),
  },
  {
    template: 'features/security/register-security.ts.ejs',
    out: (p) => join(p.root, 'register-security.ts'),
  },
  {
    template: 'features/security/index.ts.ejs',
    out: (p) => join(p.root, 'index.ts'),
  },
  {
    template: 'features/security/tests/security.test.ts.ejs',
    out: () => join('tests', 'security', 'security.test.ts'),
  },
];

/**
 * Scaffolds enterprise security middleware and runs security scans.
 */
export class SecurityManager {
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

  async setup(options: SecuritySetupOptions): Promise<SecuritySetupResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const paths = resolveSecurityPaths(options.paths);
    const language = options.language ?? 'typescript';
    const templateData = {
      appName: options.appName,
      language,
      paths,
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

    const docContent = await this.templates.renderFile('features/security/SECURITY.md.ejs', {
      data: templateData,
    });
    if (!options.dryRun) {
      await fs.write('SECURITY.md', docContent);
      const envSection = `# SECURITY\n${getSecurityEnvLines(options.appName).join('\n')}\n`;
      await fs.append('.env.example', `\n${envSection}`);
    }
    written.push('SECURITY.md', '.env.example');

    const deps = getSecurityDependencies();
    return {
      files: written,
      dependencies: deps.dependencies,
      devDependencies: deps.devDependencies,
    };
  }

  async scan(options: SecurityScanCliOptions = {}): Promise<SecurityScanCliResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const scanner = createSecurityScanner();
    const report = await scanner.scan({
      cwd,
      projectName: options.projectName ?? 'app',
    });
    const markdown = scanner.renderMarkdown(report);
    const reportPath = options.outputFile ?? 'security-report.md';
    if (!options.dryRun) {
      await fs.write(reportPath, markdown);
    }
    return {
      reportPath,
      markdown,
      findingCount: report.findings.length,
    };
  }
}

export function createSecurityManager(options?: {
  cwd?: string;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
}): SecurityManager {
  return new SecurityManager(options);
}
