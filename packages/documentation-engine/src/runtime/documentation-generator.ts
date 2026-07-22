import { randomUUID } from 'node:crypto';
import type {
  DocumentationGenerateOptions,
  DocumentationGenerateReport,
  DocumentationGenerateResultItem,
  DocumentationKind,
} from '@mycli-cli/enterprise-core';
import { type FileSystem, createFileSystem } from '@mycli-cli/filesystem';
import { type TemplateEngine, createTemplateEngine } from '@mycli-cli/template-engine';
import { listDocumentationDocuments, templatePathForKind } from '../config.js';

export interface DocumentationContext {
  appName: string;
  projectName: string;
  architectureStyle?: string;
  database?: string;
  features: Record<string, boolean>;
  language: string;
}

export interface DocumentationGeneratorOptions {
  cwd?: string;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
}

/**
 * Generates enterprise documentation files without overwriting unless forced.
 */
export class DocumentationGenerator {
  private readonly fs: FileSystem;
  private readonly templates: TemplateEngine;

  constructor(options: DocumentationGeneratorOptions = {}) {
    const cwd = options.cwd ?? process.cwd();
    this.fs = options.filesystem ?? createFileSystem(cwd);
    this.templates =
      options.templateEngine ??
      createTemplateEngine({
        filesystem: this.fs,
        templatesRoot: options.templatesRoot ?? 'templates',
      });
  }

  list(only?: DocumentationKind[]) {
    return listDocumentationDocuments(only);
  }

  async generate(options: DocumentationGenerateOptions = {}): Promise<DocumentationGenerateReport> {
    const dryRun = Boolean(options.dryRun);
    const force = Boolean(options.force);
    const context = await this.loadContext(options.projectName);
    const docs = listDocumentationDocuments(options.only);
    const results: DocumentationGenerateResultItem[] = [];

    for (const doc of docs) {
      const exists = await this.fs.exists(doc.filename);
      if (exists && !force) {
        results.push({
          kind: doc.kind,
          filename: doc.filename,
          status: dryRun ? 'planned' : 'skipped',
          reason: 'exists (use --force to overwrite)',
        });
        continue;
      }

      if (dryRun) {
        results.push({
          kind: doc.kind,
          filename: doc.filename,
          status: exists ? 'planned' : 'planned',
          reason: exists ? 'would overwrite' : 'would create',
        });
        continue;
      }

      const content = await this.templates.renderFile(templatePathForKind(doc.kind), {
        data: {
          ...context,
          doc,
        },
      });
      await this.fs.write(doc.filename, content);
      results.push({
        kind: doc.kind,
        filename: doc.filename,
        status: exists ? 'overwritten' : 'created',
      });
    }

    return {
      id: randomUUID(),
      generatedAt: new Date(),
      projectName: context.projectName,
      dryRun,
      force,
      results,
      created: results.filter((r) => r.status === 'created').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      overwritten: results.filter((r) => r.status === 'overwritten').length,
    };
  }

  private async loadContext(projectName?: string): Promise<DocumentationContext> {
    let name = projectName ?? 'app';
    let architectureStyle: string | undefined;
    let database: string | undefined;
    let features: Record<string, boolean> = {};
    let language = 'typescript';

    try {
      const config = await this.fs.readJson<{
        projectName?: string;
        architectureStyle?: string;
        database?: string;
        features?: Record<string, boolean>;
        language?: string;
        generators?: { language?: string };
      }>('.myclirc.json');
      name = config.projectName ?? name;
      architectureStyle = config.architectureStyle;
      database = config.database;
      features = config.features ?? {};
      language = config.generators?.language ?? config.language ?? language;
    } catch {
      /* optional */
    }

    return {
      appName: name,
      projectName: name,
      architectureStyle,
      database,
      features,
      language,
    };
  }
}

export function createDocumentationGenerator(
  options?: DocumentationGeneratorOptions,
): DocumentationGenerator {
  return new DocumentationGenerator(options);
}
