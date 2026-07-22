import { join } from 'node:path';
import type { MarketplaceTemplate } from '@mycli-cli/enterprise-core';

export interface TemplateMarketplacePathConfig {
  templateMarketplace?: string;
}

export interface TemplateMarketplacePaths {
  root: string;
  catalog: string;
  client: string;
  providers: string;
}

export function resolveTemplateMarketplacePaths(
  config: TemplateMarketplacePathConfig = {},
): TemplateMarketplacePaths {
  const root = config.templateMarketplace ?? 'src/template-marketplace';
  return {
    root,
    catalog: join(root, 'catalog'),
    client: join(root, 'client'),
    providers: join(root, 'providers'),
  };
}

export function getTemplateMarketplaceEnvLines(appName: string): string[] {
  return [
    `TEMPLATE_MARKETPLACE_APP=${appName}`,
    'TEMPLATE_MARKETPLACE_ENABLED=true',
    'TEMPLATE_CATALOG_PATH=.mycli/template-catalog',
  ];
}

export const LOCAL_CATALOG_DIR = '.mycli/template-catalog';
export const LOCAL_CATALOG_INDEX = join(LOCAL_CATALOG_DIR, 'index.json');
export const INSTALLED_TEMPLATES_DIR = 'templates/installed';
export const INSTALLED_MANIFEST = join(INSTALLED_TEMPLATES_DIR, 'installed.json');

/** Built-in public / sample organization templates. */
export function createBuiltinTemplates(): MarketplaceTemplate[] {
  return [
    {
      id: 'public/api-crud',
      name: 'api-crud',
      version: '1.0.0',
      author: 'MyCLI',
      description: 'REST CRUD module starter with controller, service, and repository stubs.',
      visibility: 'public',
      compatibility: '>=1.0.0',
      requirements: {
        features: [],
        architectureStyles: ['modular-monolith', 'mvc'],
      },
      tags: ['api', 'crud', 'module'],
      downloads: 1200,
    },
    {
      id: 'public/auth-jwt',
      name: 'auth-jwt',
      version: '1.1.0',
      author: 'MyCLI',
      description: 'JWT authentication middleware and token helpers.',
      visibility: 'public',
      compatibility: '>=1.0.0',
      requirements: {
        features: ['auth'],
      },
      tags: ['auth', 'jwt', 'security'],
      downloads: 890,
    },
    {
      id: 'public/saas-billing',
      name: 'saas-billing',
      version: '1.0.0',
      author: 'MyCLI',
      description: 'SaaS billing stub with plans, subscriptions, and webhook handler.',
      visibility: 'public',
      compatibility: '>=1.0.0',
      requirements: {
        features: ['auth'],
        architectureStyles: ['modular-monolith', 'domain-driven-design'],
      },
      tags: ['saas', 'billing', 'payments'],
      downloads: 540,
    },
    {
      id: 'org/acme-service',
      name: 'acme-service',
      version: '2.0.0',
      author: 'Acme Platform',
      description: 'Organization-standard microservice skeleton for Acme Corp.',
      visibility: 'organization',
      organization: 'acme',
      compatibility: '>=1.0.0',
      requirements: {
        database: ['postgresql'],
        features: ['docker', 'observability'],
      },
      tags: ['organization', 'microservice', 'acme'],
      downloads: 42,
    },
    {
      id: 'private/internal-job',
      name: 'internal-job',
      version: '0.9.0',
      author: 'Local',
      description: 'Private background job worker template (local catalog sample).',
      visibility: 'private',
      compatibility: '>=1.0.0',
      requirements: {
        features: ['testing'],
      },
      tags: ['job', 'worker', 'private'],
      downloads: 3,
    },
  ];
}

export function createTemplateStubFiles(template: MarketplaceTemplate): Record<string, string> {
  const className = template.name
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  return {
    'template.json': `${JSON.stringify(
      {
        id: template.id,
        name: template.name,
        version: template.version,
        author: template.author,
        description: template.description,
        visibility: template.visibility,
        organization: template.organization,
        compatibility: template.compatibility,
        requirements: template.requirements ?? {},
        tags: template.tags ?? [],
      },
      null,
      2,
    )}\n`,
    'README.md': `# ${template.name}\n\n${template.description}\n\n- Version: ${template.version}\n- Author: ${template.author}\n- Visibility: ${template.visibility}\n- Compatibility: ${template.compatibility}\n`,
    [`src/${template.name}.ts`]: `/**\n * Template: ${template.name}\n * Generated from MyCLI template marketplace.\n */\nexport class ${className}Template {\n  readonly name = '${template.name}';\n  readonly version = '${template.version}';\n\n  describe(): string {\n    return '${template.description.replace(/'/g, "\\'")}';\n  }\n}\n\nexport function create${className}Template(): ${className}Template {\n  return new ${className}Template();\n}\n`,
  };
}
