import { join } from 'node:path';
import { type FileSystem, createFileSystem } from '@mycli-cli/filesystem';
import { ensureFeatureRouteRegistration } from '@mycli-cli/generator-engine';
import { type TemplateEngine, createTemplateEngine } from '@mycli-cli/template-engine';

export type ApiDocsProvider = 'swagger' | 'openapi' | 'scalar' | 'redoc';

export interface ApiDocsOptions {
  cwd?: string;
  provider: ApiDocsProvider;
  title?: string;
  version?: string;
  dryRun?: boolean;
}

export interface ApiClientOptions {
  cwd?: string;
  postman?: boolean;
  bruno?: boolean;
  title?: string;
  dryRun?: boolean;
}

export interface ApiSetupResult {
  files: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

function providerDeps(provider: ApiDocsProvider): Record<string, string> {
  switch (provider) {
    case 'swagger':
      return { '@fastify/swagger': '^9.4.2', '@fastify/swagger-ui': '^5.2.1' };
    case 'scalar':
      return { '@scalar/fastify-api-reference': '^1.25.93' };
    case 'redoc':
      return { '@fastify/static': '^8.0.4' };
    default:
      return {};
  }
}

/**
 * API documentation (Swagger/OpenAPI/Scalar/Redoc) and client collection generation.
 */
export class ApiManager {
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

  async generateDocs(options: ApiDocsOptions): Promise<ApiSetupResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const title = options.title ?? 'API';
    const version = options.version ?? '1.0.0';
    const data = { title, version, provider: options.provider };
    const written: string[] = [];

    const files = [
      { template: 'features/api-docs/openapi.json.ejs', out: 'openapi.json' },
      {
        template: 'features/api-docs/swagger.config.ts.ejs',
        out: join('src', 'docs', 'swagger.config.ts'),
      },
      {
        template: 'features/api-docs/docs.routes.ts.ejs',
        out: join('src', 'docs', 'docs.routes.ts'),
      },
      { template: 'features/api-docs/API.md.ejs', out: 'API.md' },
    ];

    for (const file of files) {
      const content = await this.templates.renderFile(file.template, { data });
      if (!options.dryRun) {
        await fs.write(file.out, content);
      }
      written.push(file.out);
    }

    const featureRoutes = await ensureFeatureRouteRegistration({
      fs,
      feature: 'docs',
      dryRun: options.dryRun,
    });
    written.push(featureRoutes.path);

    return {
      files: written,
      dependencies: providerDeps(options.provider),
      devDependencies: {},
    };
  }

  async generateClients(options: ApiClientOptions): Promise<string[]> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const title = options.title ?? 'API';
    const data = { title };
    const written: string[] = [];

    if (options.postman !== false) {
      const content = await this.templates.renderFile(
        'features/api-docs/postman.collection.json.ejs',
        {
          data,
        },
      );
      if (!options.dryRun) {
        await fs.write('postman/collection.json', content);
      }
      written.push('postman/collection.json');
    }

    if (options.bruno) {
      const brunoJson = await this.templates.renderFile('features/api-docs/bruno.json.ejs', {
        data,
      });
      const healthBru = await this.templates.renderFile('features/api-docs/health.bru.ejs', {
        data,
      });
      if (!options.dryRun) {
        await fs.write('bruno/bruno.json', brunoJson);
        await fs.write('bruno/health.bru', healthBru);
      }
      written.push('bruno/bruno.json', 'bruno/health.bru');
    }

    return written;
  }
}

export function createApiManager(options?: {
  cwd?: string;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
}): ApiManager {
  return new ApiManager(options);
}
