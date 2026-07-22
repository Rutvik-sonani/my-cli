import { join } from 'node:path';
import { type FileSystem, createFileSystem } from '@mycli/filesystem';
import {
  buildNames,
  ensureFeatureRouteRegistration,
  ensureModuleBarrelExport,
} from '@mycli/generator-engine';
import { type TemplateEngine, createTemplateEngine } from '@mycli/template-engine';
import { runRbacDatabaseSync } from './sync-runner.js';
import type { RbacSetupOptions, RbacSetupResult, RbacTemplateData } from './types.js';

const RBAC_FILES = [
  'rbac.types.ts',
  'rbac.service.ts',
  'rbac.repository.ts',
  'rbac.middleware.ts',
  'rbac.routes.ts',
  'index.ts',
] as const;

export interface RbacStore {
  roles: Array<{ name: string; description?: string }>;
  permissions: Array<{ name: string; description?: string }>;
  rolePermissions: Array<{ role: string; permission: string }>;
  userRoles: Array<{ userId: string; role: string }>;
}

function defaultStore(): RbacStore {
  return { roles: [], permissions: [], rolePermissions: [], userRoles: [] };
}

function buildTemplateData(options: RbacSetupOptions): RbacTemplateData {
  const orm = options.orm ?? 'prisma';
  const persisted = ['prisma', 'drizzle', 'typeorm', 'mongoose', 'sequelize', 'mikroorm'].includes(
    orm,
  );
  return {
    orm,
    modulesPath: options.modulesPath ?? 'src/modules',
    hasPrisma: orm === 'prisma',
    hasDrizzle: orm === 'drizzle',
    hasDatabaseOrm: persisted,
  };
}

/**
 * Generates RBAC schema artifacts, middleware helpers, and role/permission wiring.
 */
export class RbacManager {
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

  async setup(options: RbacSetupOptions = {}): Promise<RbacSetupResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const data = buildTemplateData(options);
    const modulesPath = options.modulesPath ?? 'src/modules';
    const base = join(modulesPath, 'rbac');
    const written: string[] = [];

    for (const name of RBAC_FILES) {
      const templatePath =
        name === 'rbac.repository.ts'
          ? rbacRepositoryTemplate(data.orm)
          : `features/rbac/${name}.ejs`;
      const outPath = join(base, name);
      const content = await this.templates.renderFile(templatePath, {
        data: data as unknown as Record<string, unknown>,
      });
      if (!options.dryRun) {
        await fs.write(outPath, content);
      }
      written.push(outPath);
    }

    if (!options.dryRun) {
      const doc = await this.templates.renderFile('features/rbac/RBAC.md.ejs', {
        data: data as unknown as Record<string, unknown>,
      });
      await fs.write('RBAC.md', doc);
      await this.ensureStore(fs);

      if (data.hasDatabaseOrm) {
        const syncScript = await this.templates.renderFile('features/rbac/sync-rbac.ts.ejs', {
          data: data as unknown as Record<string, unknown>,
        });
        await fs.ensureDir('.mycli');
        await fs.write('.mycli/sync-rbac.ts', syncScript);
        written.push('.mycli/sync-rbac.ts');
      }
    }
    written.push('RBAC.md', '.mycli/rbac.json');

    const names = buildNames('rbac');
    const barrel = await ensureModuleBarrelExport({
      fs,
      modulesPath,
      names,
      dryRun: options.dryRun,
    });
    const featureRoutes = await ensureFeatureRouteRegistration({
      fs,
      feature: 'rbac',
      dryRun: options.dryRun,
    });
    written.push(barrel.path, featureRoutes.path);

    const deps = rbacDependencies(data.orm);
    return {
      files: written,
      dependencies: deps.dependencies,
      devDependencies: deps.devDependencies,
    };
  }

  async syncToDatabase(options: { dryRun?: boolean } = {}): Promise<string[]> {
    return runRbacDatabaseSync({
      cwd: this.fs.getRoot(),
      filesystem: this.fs,
      dryRun: options.dryRun,
    });
  }

  async ensureStore(fs?: FileSystem): Promise<RbacStore> {
    const fileSystem = fs ?? this.fs;
    await fileSystem.ensureDir('.mycli');
    if (!(await fileSystem.exists('.mycli/rbac.json'))) {
      await fileSystem.writeJson('.mycli/rbac.json', defaultStore());
    }
    return fileSystem.readJson<RbacStore>('.mycli/rbac.json');
  }

  async readStore(): Promise<RbacStore> {
    await this.ensureStore();
    return this.fs.readJson<RbacStore>('.mycli/rbac.json');
  }

  async writeStore(store: RbacStore): Promise<void> {
    await this.fs.ensureDir('.mycli');
    await this.fs.writeJson('.mycli/rbac.json', store);
  }

  async createRole(name: string, description?: string): Promise<void> {
    const store = await this.readStore();
    if (store.roles.some((r) => r.name === name)) {
      throw Object.assign(new Error(`Role already exists: ${name}`), { status: 409 });
    }
    store.roles.push({ name, description });
    await this.writeStore(store);
  }

  async createPermission(name: string, description?: string): Promise<void> {
    const store = await this.readStore();
    if (store.permissions.some((p) => p.name === name)) {
      throw Object.assign(new Error(`Permission already exists: ${name}`), { status: 409 });
    }
    store.permissions.push({ name, description });
    await this.writeStore(store);
  }

  async assignPermission(role: string, permission: string): Promise<void> {
    const store = await this.readStore();
    if (!store.roles.some((r) => r.name === role)) {
      throw Object.assign(new Error(`Role not found: ${role}`), { status: 404 });
    }
    if (!store.permissions.some((p) => p.name === permission)) {
      throw Object.assign(new Error(`Permission not found: ${permission}`), { status: 404 });
    }
    const exists = store.rolePermissions.some(
      (rp) => rp.role === role && rp.permission === permission,
    );
    if (!exists) {
      store.rolePermissions.push({ role, permission });
      await this.writeStore(store);
    }
  }

  async assignRole(userId: string, role: string): Promise<void> {
    const store = await this.readStore();
    if (!store.roles.some((r) => r.name === role)) {
      throw Object.assign(new Error(`Role not found: ${role}`), { status: 404 });
    }
    const exists = store.userRoles.some((ur) => ur.userId === userId && ur.role === role);
    if (!exists) {
      store.userRoles.push({ userId, role });
      await this.writeStore(store);
    }
  }

  async listRoles(): Promise<Array<{ name: string; description?: string }>> {
    const store = await this.readStore();
    return store.roles;
  }

  async listPermissions(): Promise<Array<{ name: string; description?: string }>> {
    const store = await this.readStore();
    return store.permissions;
  }
}

export function createRbacManager(options?: {
  cwd?: string;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
}): RbacManager {
  return new RbacManager(options);
}

const RBAC_REPO_TEMPLATES: Record<string, string> = {
  prisma: 'features/rbac/rbac.repository.prisma.ts.ejs',
  drizzle: 'features/rbac/rbac.repository.drizzle.ts.ejs',
  typeorm: 'features/rbac/rbac.repository.typeorm.ts.ejs',
  mongoose: 'features/rbac/rbac.repository.mongoose.ts.ejs',
  sequelize: 'features/rbac/rbac.repository.sequelize.ts.ejs',
  mikroorm: 'features/rbac/rbac.repository.mikroorm.ts.ejs',
};

function rbacRepositoryTemplate(orm: string): string {
  return RBAC_REPO_TEMPLATES[orm] ?? 'features/rbac/rbac.repository.memory.ts.ejs';
}

function rbacDependencies(orm: string): {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
} {
  switch (orm) {
    case 'prisma':
      return { dependencies: { '@prisma/client': '^6.2.1' }, devDependencies: { tsx: '^4.19.2' } };
    case 'drizzle':
      return { dependencies: { 'drizzle-orm': '^0.38.4' }, devDependencies: { tsx: '^4.19.2' } };
    case 'typeorm':
      return {
        dependencies: { typeorm: '^0.3.20', 'reflect-metadata': '^0.2.2' },
        devDependencies: { tsx: '^4.19.2' },
      };
    case 'mongoose':
      return { dependencies: { mongoose: '^8.9.3' }, devDependencies: { tsx: '^4.19.2' } };
    case 'sequelize':
      return { dependencies: { sequelize: '^6.37.5' }, devDependencies: { tsx: '^4.19.2' } };
    case 'mikroorm':
      return {
        dependencies: { '@mikro-orm/core': '^6.4.2' },
        devDependencies: { tsx: '^4.19.2' },
      };
    default:
      return { dependencies: {}, devDependencies: {} };
  }
}

export type { RbacSetupOptions, RbacSetupResult } from './types.js';
