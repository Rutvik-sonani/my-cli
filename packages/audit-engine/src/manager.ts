import { join } from 'node:path';
import type { AuditStorageBackend } from '@mycli/enterprise-core';
import { type FileSystem, createFileSystem } from '@mycli/filesystem';
import { type TemplateEngine, createTemplateEngine } from '@mycli/template-engine';
import {
  type AuditPathConfig,
  getAuditEnvLines,
  resolveAuditPaths,
  storageTemplateFile,
} from './config.js';

export interface AuditSetupOptions {
  appName: string;
  storage?: AuditStorageBackend;
  cwd?: string;
  dryRun?: boolean;
  paths?: AuditPathConfig;
  language?: 'typescript' | 'javascript';
}

export interface AuditSetupResult {
  files: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

interface TemplateFile {
  template: string;
  out: (paths: ReturnType<typeof resolveAuditPaths>) => string;
}

const SETUP_FILES: (storage: AuditStorageBackend) => TemplateFile[] = (storage) => [
  { template: 'features/audit/audit-record.ts.ejs', out: (p) => join(p.root, 'audit-record.ts') },
  {
    template: 'features/audit/storage/audit-storage.interface.ts.ejs',
    out: (p) => join(p.storage, 'audit-storage.interface.ts'),
  },
  {
    template: storageTemplateFile(storage),
    out: (p) => join(p.storage, `${storage}-audit.storage.ts`),
  },
  {
    template: 'features/audit/audit.repository.ts.ejs',
    out: (p) => join(p.root, 'audit.repository.ts'),
  },
  { template: 'features/audit/audit.service.ts.ejs', out: (p) => join(p.root, 'audit.service.ts') },
  {
    template: 'features/audit/audit.middleware.ts.ejs',
    out: (p) => join(p.root, 'audit.middleware.ts'),
  },
  {
    template: 'features/audit/register-audit.ts.ejs',
    out: (p) => join(p.root, 'register-audit.ts'),
  },
  { template: 'features/audit/index.ts.ejs', out: (p) => join(p.root, 'index.ts') },
  {
    template: 'features/audit/tests/audit.test.ts.ejs',
    out: () => join('tests', 'audit', 'audit.test.ts'),
  },
];

/**
 * Scaffolds enterprise audit logging: service, repository, middleware, storage.
 */
export class AuditManager {
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

  async setup(options: AuditSetupOptions): Promise<AuditSetupResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const paths = resolveAuditPaths(options.paths);
    const storage = options.storage ?? 'memory';
    const language = options.language ?? 'typescript';
    const templateData = {
      appName: options.appName,
      storage,
      language,
      paths,
    } as Record<string, unknown>;

    const written: string[] = [];

    for (const file of SETUP_FILES(storage)) {
      const outPath = file.out(paths);
      const content = await this.templates.renderFile(file.template, { data: templateData });
      if (!options.dryRun) {
        await fs.write(outPath, content);
      }
      written.push(outPath);
    }

    const docContent = await this.templates.renderFile('features/audit/AUDIT.md.ejs', {
      data: templateData,
    });
    if (!options.dryRun) {
      await fs.write('AUDIT.md', docContent);
      const envSection = `# AUDIT PLATFORM\n${getAuditEnvLines(options.appName, storage).join('\n')}\n`;
      await fs.append('.env.example', `\n${envSection}`);
    }
    written.push('AUDIT.md', '.env.example');

    return {
      files: written,
      dependencies: {},
      devDependencies: {},
    };
  }
}

export function createAuditManager(options?: {
  cwd?: string;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
}): AuditManager {
  return new AuditManager(options);
}
