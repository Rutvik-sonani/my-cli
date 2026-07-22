import { join } from 'node:path';
import type { DocumentationGenerateOptions, DocumentationKind } from '@mycli/enterprise-core';
import { type FileSystem, createFileSystem } from '@mycli/filesystem';
import { type TemplateEngine, createTemplateEngine } from '@mycli/template-engine';
import {
  type DocumentationPathConfig,
  getDocumentationEnvLines,
  listDocumentationDocuments,
  parseDocumentationKinds,
  resolveDocumentationPaths,
} from './config.js';
import { createDocumentationGenerator } from './runtime/documentation-generator.js';

export interface DocumentationSetupOptions {
  appName: string;
  cwd?: string;
  dryRun?: boolean;
  paths?: DocumentationPathConfig;
  language?: 'typescript' | 'javascript';
}

export interface DocumentationSetupResult {
  files: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export interface DocumentationRunOptions extends DocumentationGenerateOptions {
  templatesRoot?: string;
  onlyRaw?: string | string[];
}

interface TemplateFile {
  template: string;
  out: (paths: ReturnType<typeof resolveDocumentationPaths>) => string;
}

const SETUP_FILES: TemplateFile[] = [
  {
    template: 'features/documentation/documentation.types.ts.ejs',
    out: (p) => join(p.root, 'documentation.types.ts'),
  },
  {
    template: 'features/documentation/generators/catalog.ts.ejs',
    out: (p) => join(p.generators, 'catalog.ts'),
  },
  {
    template: 'features/documentation/generators/documentation.generator.ts.ejs',
    out: (p) => join(p.generators, 'documentation.generator.ts'),
  },
  {
    template: 'features/documentation/documentation.service.ts.ejs',
    out: (p) => join(p.root, 'documentation.service.ts'),
  },
  {
    template: 'features/documentation/register-documentation.ts.ejs',
    out: (p) => join(p.root, 'register-documentation.ts'),
  },
  {
    template: 'features/documentation/index.ts.ejs',
    out: (p) => join(p.root, 'index.ts'),
  },
  {
    template: 'features/documentation/tests/documentation.test.ts.ejs',
    out: () => join('tests', 'documentation', 'documentation.test.ts'),
  },
];

/**
 * Scaffolds documentation tooling and generates enterprise docs.
 */
export class DocumentationManager {
  private readonly fs: FileSystem;
  private readonly templates: TemplateEngine;
  private readonly templatesRoot: string;

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
    this.templatesRoot = options.templatesRoot ?? 'templates';
    this.templates =
      options.templateEngine ??
      createTemplateEngine({
        filesystem: this.fs,
        templatesRoot: this.templatesRoot,
      });
  }

  list(only?: DocumentationKind[]) {
    return listDocumentationDocuments(only);
  }

  async setup(options: DocumentationSetupOptions): Promise<DocumentationSetupResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const paths = resolveDocumentationPaths(options.paths);
    const language = options.language ?? 'typescript';
    const templateData = {
      appName: options.appName,
      language,
      paths,
      catalog: listDocumentationDocuments(),
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

    const doc = await this.templates.renderFile('features/documentation/DOCUMENTATION.md.ejs', {
      data: templateData,
    });
    if (!options.dryRun) {
      await fs.write('DOCUMENTATION.md', doc);
      const envSection = `# DOCUMENTATION\n${getDocumentationEnvLines(options.appName).join('\n')}\n`;
      await fs.append('.env.example', `\n${envSection}`);
    }
    written.push('DOCUMENTATION.md', '.env.example');

    return { files: written, dependencies: {}, devDependencies: {} };
  }

  async generate(options: DocumentationRunOptions = {}) {
    const only = options.only ?? parseDocumentationKinds(options.onlyRaw);
    const generator = createDocumentationGenerator({
      cwd: options.cwd ?? this.fs.getRoot(),
      filesystem: createFileSystem(options.cwd ?? this.fs.getRoot()),
      templateEngine: createTemplateEngine({
        filesystem: createFileSystem(options.cwd ?? this.fs.getRoot()),
        templatesRoot: options.templatesRoot ?? this.templatesRoot,
      }),
      templatesRoot: options.templatesRoot ?? this.templatesRoot,
    });

    return generator.generate({
      cwd: options.cwd,
      projectName: options.projectName,
      dryRun: options.dryRun,
      force: options.force,
      only,
    });
  }
}

export function createDocumentationManager(options?: {
  cwd?: string;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
}): DocumentationManager {
  return new DocumentationManager(options);
}
