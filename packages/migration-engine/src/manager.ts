import { join } from 'node:path';
import type { UpgradeEngineOptions, UpgradeScope } from '@mycli/enterprise-core';
import { type FileSystem, createFileSystem } from '@mycli/filesystem';
import { type TemplateEngine, createTemplateEngine } from '@mycli/template-engine';
import {
  type MigrationPathConfig,
  getMigrationEnvLines,
  parseUpgradeScopes,
  resolveMigrationPaths,
} from './config.js';
import { createUpgradeService } from './runtime/upgrade-service.js';

export interface MigrationSetupOptions {
  appName: string;
  cwd?: string;
  dryRun?: boolean;
  paths?: MigrationPathConfig;
  language?: 'typescript' | 'javascript';
}

export interface MigrationSetupResult {
  files: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export interface MigrationRunCliOptions extends UpgradeEngineOptions {
  cwd?: string;
  templatesRoot?: string;
  cliVersion?: string;
  scope?: string | string[];
}

interface TemplateFile {
  template: string;
  out: (paths: ReturnType<typeof resolveMigrationPaths>) => string;
}

const SETUP_FILES: TemplateFile[] = [
  {
    template: 'features/migration/migration.types.ts.ejs',
    out: (p) => join(p.root, 'migration.types.ts'),
  },
  {
    template: 'features/migration/backup/backup.service.ts.ejs',
    out: (p) => join(p.backup, 'backup.service.ts'),
  },
  {
    template: 'features/migration/reports/report.service.ts.ejs',
    out: (p) => join(p.reports, 'report.service.ts'),
  },
  {
    template: 'features/migration/migrations/registry.ts.ejs',
    out: (p) => join(p.migrations, 'registry.ts'),
  },
  {
    template: 'features/migration/upgrade.service.ts.ejs',
    out: (p) => join(p.root, 'upgrade.service.ts'),
  },
  {
    template: 'features/migration/register-migration.ts.ejs',
    out: (p) => join(p.root, 'register-migration.ts'),
  },
  {
    template: 'features/migration/index.ts.ejs',
    out: (p) => join(p.root, 'index.ts'),
  },
  {
    template: 'features/migration/tests/migration.test.ts.ejs',
    out: () => join('tests', 'migration', 'migration.test.ts'),
  },
];

/**
 * Scaffolds migration tooling and runs enterprise upgrades.
 */
export class MigrationManager {
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

  async setup(options: MigrationSetupOptions): Promise<MigrationSetupResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const paths = resolveMigrationPaths(options.paths);
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

    const doc = await this.templates.renderFile('features/migration/MIGRATION.md.ejs', {
      data: templateData,
    });
    if (!options.dryRun) {
      await fs.write('MIGRATION.md', doc);
      const envSection = `# MIGRATION / UPGRADE\n${getMigrationEnvLines(options.appName).join('\n')}\n`;
      await fs.append('.env.example', `\n${envSection}`);
    }
    written.push('MIGRATION.md', '.env.example');

    return { files: written, dependencies: {}, devDependencies: {} };
  }

  async run(options: MigrationRunCliOptions = {}) {
    const scopes: UpgradeScope[] | undefined = options.scopes
      ? options.scopes
      : options.scope
        ? parseUpgradeScopes(options.scope)
        : undefined;

    const service = createUpgradeService({
      cwd: options.cwd ?? this.fs.getRoot(),
      filesystem: createFileSystem(options.cwd ?? this.fs.getRoot()),
      templatesRoot: options.templatesRoot,
      cliVersion: options.cliVersion,
    });

    return service.run({
      dryRun: options.dryRun,
      force: options.force,
      scopes,
      targetVersion: options.targetVersion,
      skipBackup: options.skipBackup,
    });
  }
}

export function createMigrationManager(options?: {
  cwd?: string;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
}): MigrationManager {
  return new MigrationManager(options);
}
