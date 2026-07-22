import { ConfigurationError } from '@mycli/core';
import { createFileSystem } from '@mycli/filesystem';
import { type TemplateEngine, createTemplateEngine } from '@mycli/template-engine';
import { isOrmSupported } from './compatibility.js';
import { buildTemplateData, environmentFor } from './env.js';
import { createOrmGenerators, getOrmGenerator } from './orm/index.js';
import type { DatabasePlugin, DatabaseSetupOptions, DatabaseSetupResult } from './types.js';

export class DatabaseManager {
  private readonly fs: ReturnType<typeof createFileSystem>;
  private readonly templates: TemplateEngine;
  private readonly plugins = new Map<string, DatabasePlugin>();
  private readonly ormGenerators = createOrmGenerators();

  constructor(
    options: {
      cwd?: string;
      filesystem?: ReturnType<typeof createFileSystem>;
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

  registerPlugin(plugin: DatabasePlugin): this {
    this.plugins.set(plugin.name, plugin);
    return this;
  }

  getPlugin(name: string): DatabasePlugin | undefined {
    return this.plugins.get(name);
  }

  async setup(options: DatabaseSetupOptions): Promise<DatabaseSetupResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const resolved = { ...options, cwd };
    const fs = createFileSystem(cwd);
    const env = environmentFor(resolved);
    const files: string[] = [];
    let dependencies: Record<string, string> = {};
    let devDependencies: Record<string, string> = {};

    const envLines = Object.entries(env)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    if (!resolved.dryRun) {
      await this.writeEnvironmentFiles(fs, env, envLines);
      const dbDoc = await this.templates.renderFile('features/database/DATABASE.md.ejs', {
        data: buildTemplateData(resolved),
      });
      await fs.write('DATABASE.md', dbDoc);
    }
    files.push(
      '.env.example',
      '.env',
      '.env.local',
      '.env.development',
      '.env.production',
      '.env.test',
      'DATABASE.md',
    );

    if (resolved.database !== 'redis') {
      if (!isOrmSupported(resolved.database, resolved.orm)) {
        throw new ConfigurationError(
          `ORM "${resolved.orm}" is not supported with database "${resolved.database}"`,
          { code: 'INVALID_CONFIG', details: { database: resolved.database, orm: resolved.orm } },
        );
      }

      const ormGen = getOrmGenerator(resolved.orm, this.ormGenerators);
      if (ormGen) {
        const ormFiles = await ormGen.generate(resolved, this.templates);
        files.push(...ormFiles);
        const deps = ormGen.dependencies(resolved);
        dependencies = { ...dependencies, ...deps.dependencies };
        devDependencies = { ...devDependencies, ...deps.devDependencies };
      }
    }

    const plugin =
      this.plugins.get(resolved.database) ?? this.plugins.get(`${resolved.database}-database`);
    if (plugin) {
      const pluginFiles = await plugin.configure(resolved);
      files.push(...pluginFiles);

      if (plugin.generateMigration) {
        const migrationDocs = await plugin.generateMigration(resolved);
        files.push(...migrationDocs);
      }

      if (plugin.generateDocker) {
        const dockerFiles = await plugin.generateDocker(resolved);
        files.push(...dockerFiles);
      }

      const pluginEnv = plugin.generateEnvironment?.(resolved);
      if (pluginEnv) {
        Object.assign(env, pluginEnv);
      }
    }

    return { files, env, dependencies, devDependencies };
  }

  environmentFor(options: DatabaseSetupOptions): Record<string, string> {
    return environmentFor(options);
  }

  private async writeEnvironmentFiles(
    fs: ReturnType<typeof createFileSystem>,
    env: Record<string, string>,
    envLines: string,
  ): Promise<void> {
    const exampleContent = `${envLines}\nNODE_ENV=development\nPORT=3000\n`;
    await fs.write('.env.example', exampleContent);
    if (!(await fs.exists('.env'))) {
      await fs.write('.env', exampleContent);
    }
    await fs.write('.env.local', '# Local overrides (never commit)\n# DATABASE_URL=\n');
    await fs.write(
      '.env.development',
      `${envLines}\nNODE_ENV=development\nPORT=3000\nLOG_LEVEL=debug\n`,
    );
    await fs.write(
      '.env.production',
      '# Production values — set via CI/CD or secret manager\nNODE_ENV=production\nPORT=3000\nLOG_LEVEL=info\n',
    );
    await fs.write(
      '.env.test',
      `${Object.keys(env).length ? `${envLines}\n` : ''}NODE_ENV=test\nPORT=0\nLOG_LEVEL=error\n`,
    );
  }
}

export function createDatabaseManager(options?: {
  cwd?: string;
  filesystem?: ReturnType<typeof createFileSystem>;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
}): DatabaseManager {
  return new DatabaseManager(options);
}

export * from './types.js';
export { environmentFor, prismaProvider, drizzleDialect, drizzleTemplateSuffix } from './env.js';
