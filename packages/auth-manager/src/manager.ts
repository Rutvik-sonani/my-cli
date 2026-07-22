import { join } from 'node:path';
import { type FileSystem, createFileSystem } from '@mycli/filesystem';
import {
  buildNames,
  ensureFeatureRouteRegistration,
  ensureModuleBarrelExport,
} from '@mycli/generator-engine';
import { type TemplateEngine, createTemplateEngine } from '@mycli/template-engine';
import { authDependencies, authEnvLines, buildAuthTemplateData } from './config.js';
import { patchPrismaSchemaForAuth } from './schema-patch.js';
import type { AuthSetupOptions, AuthSetupResult } from './types.js';

const AUTH_FILES = [
  'auth.controller.ts',
  'auth.service.ts',
  'auth.middleware.ts',
  'auth.guard.ts',
  'token.service.ts',
  'password.service.ts',
  'auth.routes.ts',
  'user.repository.ts',
  'index.ts',
] as const;

const OPTIONAL_FILES = [
  { file: 'oauth.service.ts', when: (d: ReturnType<typeof buildAuthTemplateData>) => d.hasOAuth },
  {
    file: 'oauth-state.store.ts',
    when: (d: ReturnType<typeof buildAuthTemplateData>) => d.hasOAuth,
  },
  {
    file: 'session.service.ts',
    when: (d: ReturnType<typeof buildAuthTemplateData>) => d.hasSession,
  },
  {
    file: 'session.plugin.ts',
    when: (d: ReturnType<typeof buildAuthTemplateData>) => d.hasSession,
  },
  {
    file: 'magic-link.service.ts',
    when: (d: ReturnType<typeof buildAuthTemplateData>) => d.hasMagicLink,
  },
  {
    file: 'magic-link.repository.ts',
    when: (d: ReturnType<typeof buildAuthTemplateData>) => d.hasMagicLink,
  },
  { file: 'otp.service.ts', when: (d: ReturnType<typeof buildAuthTemplateData>) => d.hasOtp },
  { file: 'otp.repository.ts', when: (d: ReturnType<typeof buildAuthTemplateData>) => d.hasOtp },
  { file: 'mfa.service.ts', when: (d: ReturnType<typeof buildAuthTemplateData>) => d.hasMfa },
  {
    file: 'passkeys.service.ts',
    when: (d: ReturnType<typeof buildAuthTemplateData>) => d.hasPasskeys,
  },
  {
    file: 'passkey.repository.ts',
    when: (d: ReturnType<typeof buildAuthTemplateData>) => d.hasPasskeys,
  },
  {
    file: 'passkey-challenge.store.ts',
    when: (d: ReturnType<typeof buildAuthTemplateData>) => d.hasPasskeys,
  },
] as const;

/**
 * Generates authentication modules with strategy-aware EJS templates.
 */
export class AuthManager {
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

  async setup(options: AuthSetupOptions): Promise<AuthSetupResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const data = buildAuthTemplateData(options);
    const modulesPath = options.modulesPath ?? 'src/modules';
    const base = join(modulesPath, 'auth');
    const written: string[] = [];
    const templateData = data as unknown as Record<string, unknown>;

    for (const name of AUTH_FILES) {
      const templatePath =
        name === 'user.repository.ts'
          ? authUserRepositoryTemplate(data.orm)
          : `features/auth/${name}.ejs`;
      const outPath = join(base, name);
      const content = await this.templates.renderFile(templatePath, { data: templateData });
      if (!options.dryRun) {
        await fs.write(outPath, content);
      }
      written.push(outPath);
    }

    for (const optional of OPTIONAL_FILES) {
      if (!optional.when(data)) continue;
      const templatePath = `features/auth/${optional.file}.ejs`;
      const outPath = join(base, optional.file);
      const content = await this.templates.renderFile(templatePath, { data: templateData });
      if (!options.dryRun) {
        await fs.write(outPath, content);
      }
      written.push(outPath);
    }

    if (!options.dryRun) {
      const envLines = authEnvLines(data);
      await fs.append('.env.example', `\n# Auth\n${envLines.join('\n')}\n`);
      const authDoc = await this.templates.renderFile('features/auth/AUTH.md.ejs', {
        data: templateData,
      });
      await fs.write('AUTH.md', authDoc);
      if (data.orm === 'prisma') {
        const patched = await patchPrismaSchemaForAuth(fs, this.templates, data);
        written.push(...patched);
      }
    }
    written.push('.env.example', 'AUTH.md');

    const names = buildNames('auth');
    const barrel = await ensureModuleBarrelExport({
      fs,
      modulesPath,
      names,
      dryRun: options.dryRun,
    });
    const featureRoutes = await ensureFeatureRouteRegistration({
      fs,
      feature: 'auth',
      dryRun: options.dryRun,
    });
    written.push(barrel.path, featureRoutes.path);

    const deps = authDependencies(data);
    return {
      files: written,
      dependencies: deps.dependencies,
      devDependencies: deps.devDependencies,
    };
  }
}

export function createAuthManager(options?: {
  cwd?: string;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
}): AuthManager {
  return new AuthManager(options);
}

const ORM_USER_REPO_TEMPLATES: Record<string, string> = {
  typeorm: 'features/auth/user.repository.typeorm.ts.ejs',
  mongoose: 'features/auth/user.repository.mongoose.ts.ejs',
  sequelize: 'features/auth/user.repository.sequelize.ts.ejs',
  mikroorm: 'features/auth/user.repository.mikroorm.ts.ejs',
};

function authUserRepositoryTemplate(orm: string): string {
  return ORM_USER_REPO_TEMPLATES[orm] ?? 'features/auth/user.repository.ts.ejs';
}

export * from './types.js';
export { buildAuthTemplateData, authDependencies } from './config.js';
