import { join } from 'node:path';
import { type FileSystem, createFileSystem } from '@mycli-cli/filesystem';
import { type TemplateEngine, createTemplateEngine } from '@mycli-cli/template-engine';
import { type PrivacyPathConfig, getPrivacyEnvLines, resolvePrivacyPaths } from './config.js';

export interface PrivacySetupOptions {
  appName: string;
  cwd?: string;
  dryRun?: boolean;
  paths?: PrivacyPathConfig;
  language?: 'typescript' | 'javascript';
}

export interface PrivacySetupResult {
  files: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

interface TemplateFile {
  template: string;
  out: (paths: ReturnType<typeof resolvePrivacyPaths>) => string;
}

const SETUP_FILES: TemplateFile[] = [
  {
    template: 'features/privacy/privacy.types.ts.ejs',
    out: (p) => join(p.root, 'privacy.types.ts'),
  },
  {
    template: 'features/privacy/privacy.service.ts.ejs',
    out: (p) => join(p.root, 'privacy.service.ts'),
  },
  {
    template: 'features/privacy/consent/consent.store.ts.ejs',
    out: (p) => join(p.consent, 'consent.store.ts'),
  },
  {
    template: 'features/privacy/consent/consent.service.ts.ejs',
    out: (p) => join(p.consent, 'consent.service.ts'),
  },
  {
    template: 'features/privacy/cookies/cookie-tracker.ts.ejs',
    out: (p) => join(p.cookies, 'cookie-tracker.ts'),
  },
  {
    template: 'features/privacy/processing/processing-record.ts.ejs',
    out: (p) => join(p.processing, 'processing-record.ts'),
  },
  {
    template: 'features/privacy/processing/processing-registry.ts.ejs',
    out: (p) => join(p.processing, 'processing-registry.ts'),
  },
  {
    template: 'features/privacy/export/data-exporter.ts.ejs',
    out: (p) => join(p.export, 'data-exporter.ts'),
  },
  {
    template: 'features/privacy/deletion/data-deleter.ts.ejs',
    out: (p) => join(p.deletion, 'data-deleter.ts'),
  },
  {
    template: 'features/privacy/register-privacy.ts.ejs',
    out: (p) => join(p.root, 'register-privacy.ts'),
  },
  {
    template: 'features/privacy/index.ts.ejs',
    out: (p) => join(p.root, 'index.ts'),
  },
  {
    template: 'features/privacy/tests/privacy.test.ts.ejs',
    out: () => join('tests', 'privacy', 'privacy.test.ts'),
  },
];

/**
 * Scaffolds enterprise privacy: export, delete, consent, cookies, processing records.
 */
export class PrivacyManager {
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

  async setup(options: PrivacySetupOptions): Promise<PrivacySetupResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const paths = resolvePrivacyPaths(options.paths);
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

    const docContent = await this.templates.renderFile('features/privacy/PRIVACY.md.ejs', {
      data: templateData,
    });
    if (!options.dryRun) {
      await fs.write('PRIVACY.md', docContent);
      const envSection = `# PRIVACY\n${getPrivacyEnvLines(options.appName).join('\n')}\n`;
      await fs.append('.env.example', `\n${envSection}`);
    }
    written.push('PRIVACY.md', '.env.example');

    return {
      files: written,
      dependencies: {},
      devDependencies: {},
    };
  }
}

export function createPrivacyManager(options?: {
  cwd?: string;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
}): PrivacyManager {
  return new PrivacyManager(options);
}
