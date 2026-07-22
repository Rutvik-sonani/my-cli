import { join } from 'node:path';
import type { SearchProviderId } from '@mycli-cli/enterprise-core';
import { type FileSystem, createFileSystem } from '@mycli-cli/filesystem';
import { type TemplateEngine, createTemplateEngine } from '@mycli-cli/template-engine';
import {
  type SearchPathConfig,
  getSearchDependencies,
  getSearchEnvLines,
  providerClassName,
  providerTemplateFile,
  resolveSearchPaths,
} from './config.js';

export interface SearchSetupOptions {
  appName: string;
  provider?: SearchProviderId;
  cwd?: string;
  dryRun?: boolean;
  paths?: SearchPathConfig;
  language?: 'typescript' | 'javascript';
}

export interface SearchSetupResult {
  files: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

interface TemplateFile {
  template: string;
  out: (paths: ReturnType<typeof resolveSearchPaths>) => string;
}

/**
 * Scaffolds enterprise search: provider interface, adapter, indexer, query helpers.
 */
export class SearchManager {
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

  async setup(options: SearchSetupOptions): Promise<SearchSetupResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const paths = resolveSearchPaths(options.paths);
    const provider = options.provider ?? 'meilisearch';
    const language = options.language ?? 'typescript';
    const templateData = {
      appName: options.appName,
      provider,
      providerClass: providerClassName(provider),
      language,
      paths,
      isMeilisearch: provider === 'meilisearch',
      isElasticsearch: provider === 'elasticsearch',
      isAlgolia: provider === 'algolia',
    } as Record<string, unknown>;

    const files: TemplateFile[] = [
      {
        template: 'features/search/search.types.ts.ejs',
        out: (p) => join(p.root, 'search.types.ts'),
      },
      {
        template: 'features/search/search-provider.interface.ts.ejs',
        out: (p) => join(p.root, 'search-provider.interface.ts'),
      },
      {
        template: 'features/search/adapter/memory.adapter.ts.ejs',
        out: (p) => join(p.adapter, 'memory.adapter.ts'),
      },
      {
        template: providerTemplateFile(provider),
        out: (p) => join(p.adapter, `${provider}.adapter.ts`),
      },
      {
        template: 'features/search/adapter/index.ts.ejs',
        out: (p) => join(p.adapter, 'index.ts'),
      },
      {
        template: 'features/search/indexer/document-indexer.ts.ejs',
        out: (p) => join(p.indexer, 'document-indexer.ts'),
      },
      {
        template: 'features/search/query/search-query.ts.ejs',
        out: (p) => join(p.query, 'search-query.ts'),
      },
      {
        template: 'features/search/search.service.ts.ejs',
        out: (p) => join(p.root, 'search.service.ts'),
      },
      {
        template: 'features/search/register-search.ts.ejs',
        out: (p) => join(p.root, 'register-search.ts'),
      },
      {
        template: 'features/search/index.ts.ejs',
        out: (p) => join(p.root, 'index.ts'),
      },
      {
        template: 'features/search/tests/search.test.ts.ejs',
        out: () => join('tests', 'search', 'search.test.ts'),
      },
    ];

    const written: string[] = [];
    for (const file of files) {
      const outPath = file.out(paths);
      const content = await this.templates.renderFile(file.template, { data: templateData });
      if (!options.dryRun) {
        await fs.write(outPath, content);
      }
      written.push(outPath);
    }

    const docContent = await this.templates.renderFile('features/search/SEARCH.md.ejs', {
      data: templateData,
    });
    if (!options.dryRun) {
      await fs.write('SEARCH.md', docContent);
      const envSection = `# SEARCH\n${getSearchEnvLines(options.appName, provider).join('\n')}\n`;
      await fs.append('.env.example', `\n${envSection}`);
    }
    written.push('SEARCH.md', '.env.example');

    const deps = getSearchDependencies(provider);
    return {
      files: written,
      dependencies: deps.dependencies,
      devDependencies: deps.devDependencies,
    };
  }
}

export function createSearchManager(options?: {
  cwd?: string;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
}): SearchManager {
  return new SearchManager(options);
}
