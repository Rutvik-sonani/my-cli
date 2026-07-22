import { join } from 'node:path';
import type { IdentityProtocol, IdentityProviderId } from '@mycli/enterprise-core';
import { type FileSystem, createFileSystem } from '@mycli/filesystem';
import { type TemplateEngine, createTemplateEngine } from '@mycli/template-engine';
import {
  type IdentityPathConfig,
  getIdentityDependencies,
  getIdentityEnvLines,
  protocolsForProviders,
  providerTemplateFile,
  resolveIdentityPaths,
} from './config.js';

export interface EnterpriseAuthSetupOptions {
  appName: string;
  providers: IdentityProviderId[];
  cwd?: string;
  dryRun?: boolean;
  paths?: IdentityPathConfig;
  language?: 'typescript' | 'javascript';
}

export interface EnterpriseAuthSetupResult {
  files: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

interface TemplateFile {
  template: string;
  out: (paths: ReturnType<typeof resolveIdentityPaths>) => string;
}

function sharedFiles(): TemplateFile[] {
  return [
    {
      template: 'features/enterprise-auth/identity-provider.interface.ts.ejs',
      out: (p) => join(p.root, 'identity-provider.interface.ts'),
    },
    {
      template: 'features/enterprise-auth/identity.service.ts.ejs',
      out: (p) => join(p.root, 'identity.service.ts'),
    },
    {
      template: 'features/enterprise-auth/guards/identity.guard.ts.ejs',
      out: (p) => join(p.guards, 'identity.guard.ts'),
    },
    {
      template: 'features/enterprise-auth/guards/session.guard.ts.ejs',
      out: (p) => join(p.guards, 'session.guard.ts'),
    },
    {
      template: 'features/enterprise-auth/sessions/session.store.ts.ejs',
      out: (p) => join(p.sessions, 'session.store.ts'),
    },
    {
      template: 'features/enterprise-auth/sessions/session.service.ts.ejs',
      out: (p) => join(p.sessions, 'session.service.ts'),
    },
    {
      template: 'features/enterprise-auth/register-identity.ts.ejs',
      out: (p) => join(p.root, 'register-identity.ts'),
    },
    { template: 'features/enterprise-auth/index.ts.ejs', out: (p) => join(p.root, 'index.ts') },
    {
      template: 'features/enterprise-auth/tests/identity.test.ts.ejs',
      out: () => join('tests', 'identity', 'identity.test.ts'),
    },
  ];
}

function strategyFiles(protocols: IdentityProtocol[]): TemplateFile[] {
  const files: TemplateFile[] = [];
  if (protocols.includes('oauth2')) {
    files.push({
      template: 'features/enterprise-auth/strategies/oauth2.strategy.ts.ejs',
      out: (p) => join(p.strategies, 'oauth2.strategy.ts'),
    });
  }
  if (protocols.includes('oidc')) {
    files.push({
      template: 'features/enterprise-auth/strategies/oidc.strategy.ts.ejs',
      out: (p) => join(p.strategies, 'oidc.strategy.ts'),
    });
  }
  if (protocols.includes('saml')) {
    files.push({
      template: 'features/enterprise-auth/strategies/saml.strategy.ts.ejs',
      out: (p) => join(p.strategies, 'saml.strategy.ts'),
    });
  }
  if (protocols.includes('ldap')) {
    files.push({
      template: 'features/enterprise-auth/strategies/ldap.strategy.ts.ejs',
      out: (p) => join(p.strategies, 'ldap.strategy.ts'),
    });
  }
  files.push({
    template: 'features/enterprise-auth/strategies/index.ts.ejs',
    out: (p) => join(p.strategies, 'index.ts'),
  });
  return files;
}

/**
 * Scaffolds enterprise identity: OAuth2, OIDC, SAML, LDAP/AD providers, guards, sessions.
 */
export class EnterpriseAuthManager {
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

  async setup(options: EnterpriseAuthSetupOptions): Promise<EnterpriseAuthSetupResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const paths = resolveIdentityPaths(options.paths);
    const protocols = protocolsForProviders(options.providers);
    const language = options.language ?? 'typescript';
    const templateData = {
      appName: options.appName,
      providers: options.providers,
      protocols,
      language,
      paths,
    } as Record<string, unknown>;

    const written: string[] = [];
    const files: TemplateFile[] = [
      ...sharedFiles(),
      ...strategyFiles(protocols),
      {
        template: 'features/enterprise-auth/providers/index.ts.ejs',
        out: (p) => join(p.providers, 'index.ts'),
      },
    ];

    for (const provider of options.providers) {
      files.push({
        template: providerTemplateFile(provider),
        out: (p) => join(p.providers, `${provider}.provider.ts`),
      });
    }

    for (const file of files) {
      const outPath = file.out(paths);
      const content = await this.templates.renderFile(file.template, { data: templateData });
      if (!options.dryRun) {
        await fs.write(outPath, content);
      }
      written.push(outPath);
    }

    const docContent = await this.templates.renderFile(
      'features/enterprise-auth/ENTERPRISE_AUTH.md.ejs',
      {
        data: templateData,
      },
    );
    if (!options.dryRun) {
      await fs.write('ENTERPRISE_AUTH.md', docContent);
      const envSection = `# ENTERPRISE AUTH\n${getIdentityEnvLines(options.providers, options.appName).join('\n')}\n`;
      await fs.append('.env.example', `\n${envSection}`);
    }
    written.push('ENTERPRISE_AUTH.md', '.env.example');

    const deps = getIdentityDependencies(options.providers);
    return {
      files: written,
      dependencies: deps.dependencies,
      devDependencies: deps.devDependencies,
    };
  }
}

export function createEnterpriseAuthManager(options?: {
  cwd?: string;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
}): EnterpriseAuthManager {
  return new EnterpriseAuthManager(options);
}
