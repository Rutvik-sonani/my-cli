import { join } from 'node:path';
import type { TemplateVisibility } from '@mycli-cli/enterprise-core';
import { type FileSystem, createFileSystem } from '@mycli-cli/filesystem';
import { type TemplateEngine, createTemplateEngine } from '@mycli-cli/template-engine';
import {
  type TemplateMarketplacePathConfig,
  getTemplateMarketplaceEnvLines,
  resolveTemplateMarketplacePaths,
} from './config.js';
import {
  type TemplateMarketplaceService,
  createTemplateMarketplaceService,
} from './runtime/template-marketplace-service.js';

export interface TemplateMarketplaceSetupOptions {
  appName: string;
  cwd?: string;
  dryRun?: boolean;
  paths?: TemplateMarketplacePathConfig;
  language?: 'typescript' | 'javascript';
}

export interface TemplateMarketplaceSetupResult {
  files: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

interface TemplateFile {
  template: string;
  out: (paths: ReturnType<typeof resolveTemplateMarketplacePaths>) => string;
}

const SETUP_FILES: TemplateFile[] = [
  {
    template: 'features/template-marketplace/marketplace.types.ts.ejs',
    out: (p) => join(p.root, 'marketplace.types.ts'),
  },
  {
    template: 'features/template-marketplace/catalog/builtin-catalog.ts.ejs',
    out: (p) => join(p.catalog, 'builtin-catalog.ts'),
  },
  {
    template: 'features/template-marketplace/providers/catalog-provider.interface.ts.ejs',
    out: (p) => join(p.providers, 'catalog-provider.interface.ts'),
  },
  {
    template: 'features/template-marketplace/providers/local.provider.ts.ejs',
    out: (p) => join(p.providers, 'local.provider.ts'),
  },
  {
    template: 'features/template-marketplace/client/marketplace.client.ts.ejs',
    out: (p) => join(p.client, 'marketplace.client.ts'),
  },
  {
    template: 'features/template-marketplace/marketplace.service.ts.ejs',
    out: (p) => join(p.root, 'marketplace.service.ts'),
  },
  {
    template: 'features/template-marketplace/register-marketplace.ts.ejs',
    out: (p) => join(p.root, 'register-marketplace.ts'),
  },
  {
    template: 'features/template-marketplace/index.ts.ejs',
    out: (p) => join(p.root, 'index.ts'),
  },
  {
    template: 'features/template-marketplace/tests/marketplace.test.ts.ejs',
    out: () => join('tests', 'template-marketplace', 'marketplace.test.ts'),
  },
];

/**
 * Scaffolds template marketplace client and wraps search/install/publish.
 */
export class TemplateMarketplaceManager {
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

  createService(cliVersion?: string): TemplateMarketplaceService {
    return createTemplateMarketplaceService({
      cwd: this.fs.getRoot(),
      filesystem: this.fs,
      cliVersion,
    });
  }

  async setup(options: TemplateMarketplaceSetupOptions): Promise<TemplateMarketplaceSetupResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const paths = resolveTemplateMarketplacePaths(options.paths);
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

    const docContent = await this.templates.renderFile(
      'features/template-marketplace/TEMPLATE_MARKETPLACE.md.ejs',
      { data: templateData },
    );
    if (!options.dryRun) {
      await fs.write('TEMPLATE_MARKETPLACE.md', docContent);
      const envSection = `# TEMPLATE MARKETPLACE\n${getTemplateMarketplaceEnvLines(options.appName).join('\n')}\n`;
      await fs.append('.env.example', `\n${envSection}`);
    }
    written.push('TEMPLATE_MARKETPLACE.md', '.env.example');

    return {
      files: written,
      dependencies: {},
      devDependencies: {},
    };
  }

  async search(options: {
    query?: string;
    visibility?: TemplateVisibility;
    organization?: string;
    tags?: string[];
  }) {
    return this.createService().search(options);
  }

  async install(options: { name: string; dryRun?: boolean }) {
    return this.createService().install(options);
  }

  async publish(options: {
    templateDir: string;
    dryRun?: boolean;
    visibility?: TemplateVisibility;
    organization?: string;
  }) {
    return this.createService().publish(options);
  }
}

export function createTemplateMarketplaceManager(options?: {
  cwd?: string;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
}): TemplateMarketplaceManager {
  return new TemplateMarketplaceManager(options);
}
