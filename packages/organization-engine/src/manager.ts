import { join } from 'node:path';
import { type FileSystem, createFileSystem } from '@mycli/filesystem';
import { type TemplateEngine, createTemplateEngine } from '@mycli/template-engine';
import {
  type OrganizationPathConfig,
  getOrganizationEnvLines,
  resolveOrganizationPaths,
} from './config.js';

export interface OrganizationSetupOptions {
  appName: string;
  cwd?: string;
  dryRun?: boolean;
  paths?: OrganizationPathConfig;
  language?: 'typescript' | 'javascript';
}

export interface OrganizationSetupResult {
  files: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

interface TemplateFile {
  template: string;
  out: (paths: ReturnType<typeof resolveOrganizationPaths>) => string;
}

const SETUP_FILES: TemplateFile[] = [
  {
    template: 'features/organizations/organization.types.ts.ejs',
    out: (p) => join(p.root, 'organization.types.ts'),
  },
  {
    template: 'features/organizations/organization.store.ts.ejs',
    out: (p) => join(p.root, 'organization.store.ts'),
  },
  {
    template: 'features/organizations/services/organization.service.ts.ejs',
    out: (p) => join(p.services, 'organization.service.ts'),
  },
  {
    template: 'features/organizations/services/team.service.ts.ejs',
    out: (p) => join(p.services, 'team.service.ts'),
  },
  {
    template: 'features/organizations/services/member.service.ts.ejs',
    out: (p) => join(p.services, 'member.service.ts'),
  },
  {
    template: 'features/organizations/services/project.service.ts.ejs',
    out: (p) => join(p.services, 'project.service.ts'),
  },
  {
    template: 'features/organizations/services/permission.service.ts.ejs',
    out: (p) => join(p.services, 'permission.service.ts'),
  },
  {
    template: 'features/organizations/organization.platform.ts.ejs',
    out: (p) => join(p.root, 'organization.platform.ts'),
  },
  {
    template: 'features/organizations/register-organization.ts.ejs',
    out: (p) => join(p.root, 'register-organization.ts'),
  },
  {
    template: 'features/organizations/index.ts.ejs',
    out: (p) => join(p.root, 'index.ts'),
  },
  {
    template: 'features/organizations/tests/organization.test.ts.ejs',
    out: () => join('tests', 'organizations', 'organization.test.ts'),
  },
];

/**
 * Scaffolds enterprise organization management: companies, teams, members, projects, roles.
 */
export class OrganizationManager {
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

  async setup(options: OrganizationSetupOptions): Promise<OrganizationSetupResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const paths = resolveOrganizationPaths(options.paths);
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
      'features/organizations/ORGANIZATION.md.ejs',
      { data: templateData },
    );
    if (!options.dryRun) {
      await fs.write('ORGANIZATION.md', docContent);
      const envSection = `# ORGANIZATION\n${getOrganizationEnvLines(options.appName).join('\n')}\n`;
      await fs.append('.env.example', `\n${envSection}`);
    }
    written.push('ORGANIZATION.md', '.env.example');

    return {
      files: written,
      dependencies: {},
      devDependencies: {},
    };
  }
}

export function createOrganizationManager(options?: {
  cwd?: string;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
}): OrganizationManager {
  return new OrganizationManager(options);
}
