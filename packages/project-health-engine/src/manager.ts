import { join } from 'node:path';
import type { HealthCategory, ProjectHealthAnalyzeOptions } from '@mycli-cli/enterprise-core';
import { type FileSystem, createFileSystem } from '@mycli-cli/filesystem';
import { type TemplateEngine, createTemplateEngine } from '@mycli-cli/template-engine';
import {
  type ProjectHealthPathConfig,
  getProjectHealthEnvLines,
  resolveProjectHealthPaths,
} from './config.js';
import { createProjectHealthAnalyzer } from './runtime/health-analyzer.js';

export interface ProjectHealthSetupOptions {
  appName: string;
  cwd?: string;
  dryRun?: boolean;
  paths?: ProjectHealthPathConfig;
  language?: 'typescript' | 'javascript';
}

export interface ProjectHealthSetupResult {
  files: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

interface TemplateFile {
  template: string;
  out: (paths: ReturnType<typeof resolveProjectHealthPaths>) => string;
}

const SETUP_FILES: TemplateFile[] = [
  {
    template: 'features/project-health/health.types.ts.ejs',
    out: (p) => join(p.root, 'health.types.ts'),
  },
  {
    template: 'features/project-health/analyzers/architecture.analyzer.ts.ejs',
    out: (p) => join(p.analyzers, 'architecture.analyzer.ts'),
  },
  {
    template: 'features/project-health/analyzers/security.analyzer.ts.ejs',
    out: (p) => join(p.analyzers, 'security.analyzer.ts'),
  },
  {
    template: 'features/project-health/analyzers/index.ts.ejs',
    out: (p) => join(p.analyzers, 'index.ts'),
  },
  {
    template: 'features/project-health/reports/report.service.ts.ejs',
    out: (p) => join(p.reports, 'report.service.ts'),
  },
  {
    template: 'features/project-health/health.service.ts.ejs',
    out: (p) => join(p.root, 'health.service.ts'),
  },
  {
    template: 'features/project-health/register-health.ts.ejs',
    out: (p) => join(p.root, 'register-health.ts'),
  },
  {
    template: 'features/project-health/index.ts.ejs',
    out: (p) => join(p.root, 'index.ts'),
  },
  {
    template: 'features/project-health/tests/health.test.ts.ejs',
    out: () => join('tests', 'project-health', 'health.test.ts'),
  },
];

/**
 * Scaffolds project health analysis and generates health reports.
 */
export class ProjectHealthManager {
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

  async setup(options: ProjectHealthSetupOptions): Promise<ProjectHealthSetupResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const paths = resolveProjectHealthPaths(options.paths);
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

    const doc = await this.templates.renderFile('features/project-health/PROJECT_HEALTH.md.ejs', {
      data: templateData,
    });
    if (!options.dryRun) {
      await fs.write('PROJECT_HEALTH.md', doc);
      const envSection = `# PROJECT HEALTH\n${getProjectHealthEnvLines(options.appName).join('\n')}\n`;
      await fs.append('.env.example', `\n${envSection}`);
    }
    written.push('PROJECT_HEALTH.md', '.env.example');

    return { files: written, dependencies: {}, devDependencies: {} };
  }

  async analyze(options: ProjectHealthAnalyzeOptions & { categories?: HealthCategory[] } = {}) {
    const analyzer = createProjectHealthAnalyzer({
      cwd: options.cwd ?? this.fs.getRoot(),
      filesystem: createFileSystem(options.cwd ?? this.fs.getRoot()),
    });
    return analyzer.analyze(options);
  }
}

export function createProjectHealthManager(options?: {
  cwd?: string;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
}): ProjectHealthManager {
  return new ProjectHealthManager(options);
}
