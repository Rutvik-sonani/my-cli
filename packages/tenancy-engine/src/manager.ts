import { join } from 'node:path';
import type { TenancyStrategy, TenantModel } from '@mycli/enterprise-core';
import { type FileSystem, createFileSystem } from '@mycli/filesystem';
import { type TemplateEngine, createTemplateEngine } from '@mycli/template-engine';
import { type TenancyPathConfig, getTenancyEnvLines, resolveTenancyPaths } from './config.js';

export interface TenancySetupOptions {
  appName: string;
  model: TenantModel;
  strategy: TenancyStrategy;
  cwd?: string;
  dryRun?: boolean;
  paths?: TenancyPathConfig;
  language?: 'typescript' | 'javascript';
}

export interface TenancySetupResult {
  files: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

interface TemplateFile {
  template: string;
  out: (paths: ReturnType<typeof resolveTenancyPaths>) => string;
}

function sharedFiles(): TemplateFile[] {
  return [
    {
      template: 'features/tenancy/tenant.context.ts.ejs',
      out: (p) => join(p.root, 'tenant.context.ts'),
    },
    {
      template: 'features/tenancy/entities/Tenant.ts.ejs',
      out: (p) => join(p.entities, 'Tenant.ts'),
    },
    {
      template: 'features/tenancy/repositories/tenant.repository.ts.ejs',
      out: (p) => join(p.repositories, 'tenant.repository.ts'),
    },
    {
      template: 'features/tenancy/register-tenancy.ts.ejs',
      out: (p) => join(p.root, 'register-tenancy.ts'),
    },
    { template: 'features/tenancy/index.ts.ejs', out: (p) => join(p.root, 'index.ts') },
    {
      template: 'features/tenancy/tests/tenancy.test.ts.ejs',
      out: () => join('tests', 'tenancy', 'tenancy.test.ts'),
    },
  ];
}

function strategyFiles(model: TenantModel, strategy: TenancyStrategy): TemplateFile[] {
  if (model === 'single-tenant') {
    return [
      {
        template: 'features/tenancy/tenant.middleware.single-tenant.ts.ejs',
        out: (p) => join(p.root, 'tenant.middleware.ts'),
      },
      {
        template: 'features/tenancy/tenant.resolver.single-tenant.ts.ejs',
        out: (p) => join(p.root, 'tenant.resolver.ts'),
      },
    ];
  }

  switch (strategy) {
    case 'schema-per-tenant':
      return [
        {
          template: 'features/tenancy/tenant.middleware.schema-per-tenant.ts.ejs',
          out: (p) => join(p.root, 'tenant.middleware.ts'),
        },
        {
          template: 'features/tenancy/tenant.resolver.schema-per-tenant.ts.ejs',
          out: (p) => join(p.root, 'tenant.resolver.ts'),
        },
        {
          template: 'features/tenancy/schema/schema-manager.ts.ejs',
          out: (p) => join(p.schema, 'schema-manager.ts'),
        },
        {
          template: 'features/tenancy/schema/tenant-schema.service.ts.ejs',
          out: (p) => join(p.schema, 'tenant-schema.service.ts'),
        },
      ];
    case 'db-per-tenant':
      return [
        {
          template: 'features/tenancy/tenant.middleware.db-per-tenant.ts.ejs',
          out: (p) => join(p.root, 'tenant.middleware.ts'),
        },
        {
          template: 'features/tenancy/tenant.resolver.db-per-tenant.ts.ejs',
          out: (p) => join(p.root, 'tenant.resolver.ts'),
        },
        {
          template: 'features/tenancy/database/tenant-connection-manager.ts.ejs',
          out: (p) => join(p.database, 'tenant-connection-manager.ts'),
        },
        {
          template: 'features/tenancy/database/tenant-provisioning.service.ts.ejs',
          out: (p) => join(p.database, 'tenant-provisioning.service.ts'),
        },
        {
          template: 'features/tenancy/database/tenant-migration-runner.ts.ejs',
          out: (p) => join(p.database, 'tenant-migration-runner.ts'),
        },
      ];
    default:
      return [
        {
          template: 'features/tenancy/tenant.middleware.shared-db.ts.ejs',
          out: (p) => join(p.root, 'tenant.middleware.ts'),
        },
        {
          template: 'features/tenancy/tenant.resolver.shared-db.ts.ejs',
          out: (p) => join(p.root, 'tenant.resolver.ts'),
        },
        {
          template: 'features/tenancy/tenant-filter.ts.ejs',
          out: (p) => join(p.root, 'tenant-filter.ts'),
        },
        {
          template: 'features/tenancy/migrations/add-tenant-id.example.sql.ejs',
          out: () => join('migrations', 'tenancy', '001_add_tenant_id_columns.sql'),
        },
      ];
  }
}

/**
 * Scaffolds enterprise multi-tenancy for single-tenant or multi-tenant SaaS applications.
 */
export class TenancyManager {
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

  async setup(options: TenancySetupOptions): Promise<TenancySetupResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const paths = resolveTenancyPaths(options.paths);
    const language = options.language ?? 'typescript';
    const templateData = {
      appName: options.appName,
      model: options.model,
      strategy: options.strategy,
      language,
      paths,
    } as Record<string, unknown>;

    const written: string[] = [];
    const files = [...sharedFiles(), ...strategyFiles(options.model, options.strategy)];

    for (const file of files) {
      const outPath = file.out(paths);
      const content = await this.templates.renderFile(file.template, { data: templateData });
      if (!options.dryRun) {
        await fs.write(outPath, content);
      }
      written.push(outPath);
    }

    const docContent = await this.templates.renderFile('features/tenancy/TENANCY.md.ejs', {
      data: templateData,
    });
    if (!options.dryRun) {
      await fs.write('TENANCY.md', docContent);
      const envSection = `# TENANCY (${options.model}, ${options.strategy})\n${getTenancyEnvLines(options.model, options.strategy, options.appName).join('\n')}\n`;
      await fs.append('.env.example', `\n${envSection}`);
    }
    written.push('TENANCY.md', '.env.example');

    return {
      files: written,
      dependencies: {},
      devDependencies: {},
    };
  }
}

export function createTenancyManager(options?: {
  cwd?: string;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
}): TenancyManager {
  return new TenancyManager(options);
}
