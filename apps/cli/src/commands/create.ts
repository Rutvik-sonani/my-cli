import { join } from 'node:path';
import { createApiManager } from '@mycli/api-manager';
import { createArchitectureEngine } from '@mycli/architecture-engine';
import { createAuthManager } from '@mycli/auth-manager';
import { createCicdManager } from '@mycli/cicd-manager';
import type { CliEngine } from '@mycli/cli-engine';
import { defineCommand } from '@mycli/command-engine';
import { createDatabaseManager } from '@mycli/database-manager';
import type { DatabaseEngine, OrmEngine } from '@mycli/database-manager';
import { createDependencyManager } from '@mycli/dependency-manager';
import { createDockerManager } from '@mycli/docker-manager';
import { createFileSystem } from '@mycli/filesystem';
import { createFrontendManager } from '@mycli/frontend-manager';
import {
  type BranchStrategy,
  type CommitConvention,
  type GitProvider,
  createGitManager,
} from '@mycli/git-manager';
import { createGithubManager } from '@mycli/github-manager';
import { createIdeManager } from '@mycli/ide-manager';
import { createRbacManager } from '@mycli/rbac-manager';
import { type VersionStrategy, createReleaseManager } from '@mycli/release-manager';
import { createTelemetryManager } from '@mycli/telemetry-manager';
import { createTemplateEngine } from '@mycli/template-engine';
import { createTestingManager } from '@mycli/testing-manager';
import { createUiManager } from '@mycli/ui-manager';
import pc from 'picocolors';
import { resolveTemplatesRoot } from '../paths.js';
import { wireDatabasePlugin } from '../utils/database.js';
import { mergeDependencyRecords, mergeDepsIntoPackageJson } from '../utils/deps.js';
import { setupEnterpriseSaas, writeDefaultDeploymentDoc } from '../utils/enterprise.js';
import { type QualityToolchain, setupQuality } from '../utils/quality.js';
import { type NodeToolchain, setupNodeToolchain } from '../utils/toolchain.js';

export function createCommand(engine: CliEngine) {
  return defineCommand({
    name: 'create',
    description: 'Create a new application with the interactive project wizard',
    arguments: [{ name: 'name', description: 'Project name', required: false }],
    options: [
      { flags: '--yes', description: 'Skip prompts and use defaults', defaultValue: false },
      { flags: '--language <language>', description: 'Project language (typescript|javascript)' },
      {
        flags: '--app-type',
        description:
          'Application type (api|full-stack|frontend|library|microservice|enterprise-saas)',
      },
      { flags: '--database', description: 'Database engine (postgresql|mysql|mongodb|…)' },
      { flags: '--orm', description: 'ORM (prisma|drizzle|typeorm|mongoose|sequelize|mikroorm)' },
      { flags: '--dry-run', description: 'Preview without writing files', defaultValue: false },
      { flags: '--skip-install', description: 'Skip dependency installation', defaultValue: false },
      { flags: '--skip-git', description: 'Skip git initialization', defaultValue: false },
      {
        flags: '--publish <provider>',
        description: 'Publish to remote after create (github|gitlab|…)',
      },
      {
        flags: '--git-private',
        description: 'Create private remote repository',
        defaultValue: false,
      },
      { flags: '--git-owner <owner>', description: 'Remote repository owner / namespace' },
      { flags: '--git-org <org>', description: 'Azure DevOps organization URL or slug' },
      { flags: '--git-project <project>', description: 'Azure DevOps project name' },
      {
        flags: '--labels',
        description: 'Create GitHub labels after publish (GitHub only)',
        defaultValue: false,
      },
      {
        flags: '--branch-strategy <strategy>',
        description: 'Branch strategy (git-flow|github-flow|trunk-based)',
      },
      {
        flags: '--commit-convention <convention>',
        description: 'Commit convention (conventional|angular|custom)',
      },
      {
        flags: '--git-hooks',
        description: 'Add Husky git hooks and commitlint',
        defaultValue: false,
      },
      { flags: '--cicd', description: 'Add CI/CD pipeline configuration', defaultValue: false },
      {
        flags: '--version-strategy <strategy>',
        description: 'Release version strategy (semver|calver)',
      },
      {
        flags: '--eslint',
        description: 'Use ESLint instead of Biome for linting',
        defaultValue: false,
      },
      { flags: '--prettier', description: 'Add Prettier formatting config', defaultValue: false },
      {
        flags: '--node-toolchain <toolchain>',
        description: 'Node version manager (nvm|volta|asdf|none)',
      },
      {
        flags: '--architecture-style <style>',
        description:
          'Architecture style (mvc|modular-monolith|clean-architecture|hexagonal|domain-driven-design|microservice|monolith|monorepo|polyrepo)',
      },
      {
        flags: '--ui-package <name>',
        description: 'Custom npm UI package when UI library is other',
      },
      {
        flags: '--devcontainer',
        description: 'Add DevContainer configuration',
        defaultValue: false,
      },
      {
        flags: '--ide',
        description: 'Add VS Code and Cursor IDE configuration',
        defaultValue: false,
      },
    ],
    examples: ['my create', 'my create ecommerce', 'my create api --yes'],
    async handler(ctx) {
      const prompts = engine.prompts;
      const t = (key: string, params?: Record<string, string>) => engine.i18n.t(key, params);
      const dryRun = Boolean(ctx.options.dryRun || engine.app.dryRun);
      const useDefaults = Boolean(ctx.options.yes);

      prompts.intro(t('create_intro'));

      const projectName =
        (ctx.args.name as string | undefined) ??
        (useDefaults
          ? 'my-app'
          : await prompts.text({
              message: t('project_name'),
              placeholder: t('project_name_placeholder'),
              defaultValue: 'my-app',
              validate: (v) => (/^[a-z0-9-_]+$/i.test(v) ? undefined : t('project_name_invalid')),
            }));

      const applicationType =
        (ctx.options.appType as string | undefined) ??
        (ctx.args.name && useDefaults ? 'api' : undefined) ??
        (useDefaults
          ? 'api'
          : await prompts.select({
              message: t('application_type'),
              options: [
                { value: 'api', label: 'API' },
                { value: 'full-stack', label: 'Full Stack' },
                { value: 'frontend', label: 'Frontend' },
                { value: 'library', label: 'Library' },
                { value: 'microservice', label: 'Microservice' },
                { value: 'enterprise-saas', label: 'Enterprise SaaS' },
              ],
            }));

      const backend =
        applicationType === 'frontend' || applicationType === 'library'
          ? 'none'
          : useDefaults
            ? 'fastify'
            : await prompts.select({
                message: t('backend_framework'),
                options: [
                  { value: 'express', label: 'Express' },
                  { value: 'fastify', label: 'Fastify' },
                  { value: 'hono', label: 'Hono' },
                  { value: 'koa', label: 'Koa' },
                  { value: 'nestjs-style', label: 'NestJS Style' },
                ],
              });

      const frontend =
        applicationType === 'api' ||
        applicationType === 'library' ||
        applicationType === 'microservice'
          ? 'none'
          : useDefaults
            ? applicationType === 'frontend'
              ? 'react'
              : 'next'
            : await prompts.select({
                message: t('frontend_framework'),
                options: [
                  { value: 'none', label: 'None' },
                  { value: 'react', label: 'React' },
                  { value: 'next', label: 'Next.js' },
                  { value: 'vue', label: 'Vue' },
                  { value: 'nuxt', label: 'Nuxt' },
                  { value: 'angular', label: 'Angular' },
                ],
              });

      const uiLibrary =
        frontend === 'none'
          ? 'none'
          : useDefaults
            ? 'tailwind'
            : await prompts.select({
                message: t('ui_library'),
                options: [
                  { value: 'none', label: 'None' },
                  { value: 'tailwind', label: 'Tailwind CSS' },
                  { value: 'shadcn', label: 'Shadcn UI' },
                  { value: 'mui', label: 'MUI' },
                  { value: 'antd', label: 'Ant Design' },
                  { value: 'chakra', label: 'Chakra UI' },
                  { value: 'mantine', label: 'Mantine' },
                  { value: 'other', label: 'Other (npm package)' },
                ],
              });

      let customUiPackage: string | undefined = ctx.options.uiPackage as string | undefined;
      if (uiLibrary === 'other' && !customUiPackage && !useDefaults) {
        customUiPackage = await prompts.text({
          message: t('ui_package_name'),
          validate: (v) => (v.trim() ? undefined : t('ui_package_required')),
        });
      }

      const nodeToolchain: NodeToolchain =
        (ctx.options.nodeToolchain as NodeToolchain | undefined) ??
        (useDefaults
          ? 'nvm'
          : await prompts.select({
              message: t('node_toolchain'),
              options: [
                { value: 'nvm', label: 'nvm (.nvmrc)' },
                { value: 'volta', label: 'Volta (package.json pin)' },
                { value: 'asdf', label: 'asdf (.tool-versions)' },
                { value: 'none', label: 'None' },
              ],
            }));

      const architectureEngine = createArchitectureEngine({
        cwd: engine.app.cwd,
        templatesRoot: resolveTemplatesRoot(),
      });

      const architectureStyleInput = ctx.options.architectureStyle as string | undefined;
      const defaultArchitectureStyle =
        applicationType === 'microservice' ? 'microservice' : 'modular-monolith';

      const architecture = architectureStyleInput
        ? (architectureEngine.normalizeStyle(architectureStyleInput) ?? defaultArchitectureStyle)
        : useDefaults
          ? defaultArchitectureStyle
          : await prompts.select({
              message: t('architecture_style'),
              options: [
                { value: 'mvc', label: 'MVC' },
                { value: 'modular-monolith', label: 'Modular Monolith' },
                { value: 'clean-architecture', label: 'Clean Architecture' },
                { value: 'hexagonal', label: 'Hexagonal Architecture' },
                { value: 'domain-driven-design', label: 'Domain Driven Design' },
                { value: 'microservice', label: 'Microservice Architecture' },
                { value: 'monolith', label: 'Monolith (legacy)' },
                { value: 'monorepo', label: 'Monorepo (layout)' },
                { value: 'polyrepo', label: 'Polyrepo (layout)' },
              ],
            });

      const language =
        (ctx.options.language as 'typescript' | 'javascript' | undefined) ??
        (useDefaults
          ? 'typescript'
          : await prompts.select({
              message: t('language'),
              options: [
                { value: 'typescript', label: 'TypeScript' },
                { value: 'javascript', label: 'JavaScript' },
              ],
            }));
      const isJavaScript = language === 'javascript';

      const database =
        backend === 'none'
          ? 'none'
          : ((ctx.options.database as string | undefined) ??
            (useDefaults
              ? 'postgresql'
              : await prompts.select({
                  message: t('database'),
                  options: [
                    { value: 'postgresql', label: 'PostgreSQL' },
                    { value: 'mysql', label: 'MySQL' },
                    { value: 'mariadb', label: 'MariaDB' },
                    { value: 'sqlite', label: 'SQLite' },
                    { value: 'mongodb', label: 'MongoDB' },
                    { value: 'redis', label: 'Redis (cache)' },
                    { value: 'sqlserver', label: 'SQL Server' },
                    { value: 'cockroachdb', label: 'CockroachDB' },
                    { value: 'none', label: 'None' },
                  ],
                })));

      const orm =
        database === 'none' || database === 'redis'
          ? 'none'
          : ((ctx.options.orm as string | undefined) ??
            (useDefaults
              ? database === 'mongodb'
                ? 'mongoose'
                : 'prisma'
              : await prompts.select({
                  message: t('orm'),
                  options:
                    database === 'mongodb'
                      ? [
                          { value: 'mongoose', label: 'Mongoose' },
                          { value: 'prisma', label: 'Prisma' },
                          { value: 'mikroorm', label: 'MikroORM' },
                        ]
                      : [
                          { value: 'prisma', label: 'Prisma' },
                          { value: 'drizzle', label: 'Drizzle' },
                          { value: 'typeorm', label: 'TypeORM' },
                          { value: 'sequelize', label: 'Sequelize' },
                          { value: 'mikroorm', label: 'MikroORM' },
                        ],
                })));

      const withDocker = useDefaults
        ? true
        : await prompts.confirm({ message: t('add_docker'), initialValue: true });

      const withGit = ctx.options.skipGit
        ? false
        : useDefaults
          ? true
          : await prompts.confirm({ message: t('init_git'), initialValue: true });

      const publishFlag = ctx.options.publish as string | undefined;
      let gitProvider: GitProvider = 'skip';
      let branchStrategy: BranchStrategy = 'github-flow';
      let commitConvention: CommitConvention = 'conventional';
      let withGitHooks = Boolean(ctx.options.gitHooks);
      let withCicd = Boolean(ctx.options.cicd);
      let versionStrategy: VersionStrategy = 'semver';
      let qualityToolchain: QualityToolchain = ctx.options.eslint ? 'eslint' : 'biome';
      let withPrettier = Boolean(ctx.options.prettier);
      const packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun' = 'pnpm';

      if (withGit) {
        if (publishFlag && publishFlag !== 'skip') {
          gitProvider = publishFlag as GitProvider;
        } else if (!useDefaults) {
          gitProvider = await prompts.select({
            message: t('git_provider'),
            options: [
              { value: 'github', label: 'GitHub' },
              { value: 'gitlab', label: 'GitLab' },
              { value: 'bitbucket', label: 'Bitbucket' },
              { value: 'azure-devops', label: 'Azure DevOps' },
              { value: 'skip', label: 'Skip (local only)' },
            ],
          });
        }

        const branchFlag = ctx.options.branchStrategy as string | undefined;
        branchStrategy =
          (branchFlag as BranchStrategy | undefined) ??
          (useDefaults
            ? 'github-flow'
            : await prompts.select({
                message: t('branch_strategy'),
                options: [
                  { value: 'github-flow', label: 'GitHub Flow (main)' },
                  { value: 'git-flow', label: 'Git Flow (main + develop)' },
                  { value: 'trunk-based', label: 'Trunk-based (main)' },
                ],
              }));

        const conventionFlag = ctx.options.commitConvention as string | undefined;
        commitConvention =
          (conventionFlag as CommitConvention | undefined) ??
          (useDefaults
            ? 'conventional'
            : await prompts.select({
                message: t('commit_convention'),
                options: [
                  { value: 'conventional', label: 'Conventional Commits' },
                  { value: 'angular', label: 'Angular' },
                  { value: 'custom', label: 'Custom (commitlint base)' },
                ],
              }));

        if (!useDefaults && !ctx.options.gitHooks) {
          withGitHooks = await prompts.confirm({
            message: t('git_hooks'),
            initialValue: true,
          });
        }

        if (!useDefaults && !ctx.options.cicd) {
          withCicd = await prompts.confirm({
            message: t('add_cicd'),
            initialValue: gitProvider === 'github',
          });
        }

        const versionFlag = ctx.options.versionStrategy as string | undefined;
        versionStrategy =
          (versionFlag as VersionStrategy | undefined) ??
          (useDefaults
            ? 'semver'
            : await prompts.select({
                message: t('version_strategy'),
                options: [
                  { value: 'semver', label: 'Semantic versioning (1.0.0)' },
                  { value: 'calver', label: 'Calendar versioning (YYYY.MM.DD)' },
                ],
              }));
      }

      if (!useDefaults && !ctx.options.eslint && !ctx.options.prettier) {
        qualityToolchain = await prompts.select({
          message: t('quality_toolchain'),
          options: [
            { value: 'biome', label: 'Biome (lint + format)' },
            { value: 'eslint', label: 'ESLint (+ optional Prettier)' },
          ],
        });
        if (qualityToolchain === 'eslint') {
          withPrettier = await prompts.confirm({
            message: t('add_prettier'),
            initialValue: true,
          });
        }
      } else if (ctx.options.eslint) {
        qualityToolchain = 'eslint';
      }

      const defaultBranch = 'main';
      const templatesRoot = resolveTemplatesRoot();

      const withDevcontainer = ctx.options.devcontainer
        ? true
        : useDefaults
          ? false
          : await prompts.confirm({ message: t('add_devcontainer'), initialValue: false });

      const withIde = ctx.options.ide
        ? true
        : useDefaults
          ? false
          : await prompts.confirm({ message: t('add_ide'), initialValue: false });

      const isEnterpriseSaas = applicationType === 'enterprise-saas';

      const withAuth =
        backend !== 'none' &&
        (isEnterpriseSaas ||
          (!useDefaults
            ? await prompts.confirm({ message: t('add_auth'), initialValue: false })
            : false));

      const withRbac =
        withAuth &&
        (isEnterpriseSaas ||
          (!useDefaults
            ? await prompts.confirm({ message: t('add_rbac'), initialValue: false })
            : false));

      const withSwagger =
        backend !== 'none' &&
        (isEnterpriseSaas ||
          (!useDefaults
            ? await prompts.confirm({ message: t('add_swagger'), initialValue: false })
            : false));

      const helpImprove = useDefaults
        ? false
        : await prompts.confirm({ message: t('help_improve'), initialValue: false });

      const targetDir = join(engine.app.cwd, projectName);
      const fs = createFileSystem(engine.app.cwd);
      const spinner = prompts.spinner('Generating project');
      spinner.start(t('create_spinner_start'));

      const checklist: Array<{ label: string; ok: boolean }> = [];
      const featureDeps: Array<{
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      }> = [];

      try {
        if (!dryRun) {
          if (await fs.exists(projectName)) {
            throw new Error(`Directory already exists: ${projectName}`);
          }
          await fs.ensureDir(projectName);
        }

        const projectFs = createFileSystem(targetDir);
        const templates = createTemplateEngine({
          filesystem: projectFs,
          templatesRoot,
        });

        const qualityPreview = await setupQuality(projectFs, templates, {
          toolchain: qualityToolchain,
          eslint: qualityToolchain === 'eslint',
          prettier: withPrettier,
          dryRun: true,
        });
        const toolchainPreview = await setupNodeToolchain(projectFs, templates, {
          toolchain: nodeToolchain,
          nodeVersion: '22',
          dryRun: true,
        });

        const packageJson: Record<string, unknown> = {
          name: projectName,
          version: '1.0.0',
          private: true,
          type: 'module',
          engines: { node: '>=22' },
          scripts: {
            dev: isJavaScript ? 'node --watch src/index.js' : 'node --watch dist/index.js',
            ...(isJavaScript ? {} : { build: 'tsc -p tsconfig.json' }),
            start: isJavaScript ? 'node src/index.js' : 'node dist/index.js',
            test: 'vitest run',
            lint: qualityPreview.lintScript,
          },
          dependencies: backendDependencies(backend),
          devDependencies: {
            vitest: '^2.1.8',
            ...qualityPreview.devDependencies,
            ...(isJavaScript
              ? {}
              : {
                  typescript: '^5.7.3',
                  '@types/node': '^22.10.5',
                }),
          },
        };

        if (toolchainPreview.packageJsonPatch?.volta) {
          packageJson.volta = toolchainPreview.packageJsonPatch.volta;
        }

        if (!dryRun) {
          await projectFs.writeJson('package.json', packageJson);
          if (!isJavaScript) {
            await projectFs.writeJson('tsconfig.json', {
              compilerOptions: {
                target: 'ES2022',
                module: 'NodeNext',
                moduleResolution: 'NodeNext',
                strict: true,
                outDir: 'dist',
                rootDir: 'src',
                esModuleInterop: true,
                skipLibCheck: true,
              },
              include: ['src/**/*'],
            });
          }
          const entryFile = isJavaScript ? 'src/index.js' : 'src/index.ts';
          await projectFs.write(
            entryFile,
            await templates.renderString(APP_ENTRY_TEMPLATE, {
              data: { projectName, backend, port: 3000 },
            }),
          );
          if (backend === 'fastify') {
            await projectFs.write(
              isJavaScript ? 'src/routes/features.js' : 'src/routes/features.ts',
              isJavaScript ? FASTIFY_FEATURES_JS : FASTIFY_FEATURES_TS,
            );
          }
          await projectFs.write(
            'README.md',
            await templates.renderString(README_TEMPLATE, {
              data: { projectName, applicationType, backend, frontend, architecture, language },
            }),
          );
          await projectFs.writeJson('.myclirc.json', {
            version: '1.0.0',
            projectName,
            applicationType,
            architecture,
            language,
            backend,
            frontend,
            uiLibrary: uiLibrary === 'none' ? undefined : uiLibrary,
            extensions:
              uiLibrary === 'other' && customUiPackage
                ? { uiPackage: customUiPackage, nodeToolchain }
                : { nodeToolchain },
            database: database === 'none' ? undefined : database,
            orm: orm === 'none' ? undefined : orm,
            gitProvider: gitProvider === 'skip' ? undefined : gitProvider,
            branchStrategy: withGit ? branchStrategy : undefined,
            commitConvention: withGit ? commitConvention : undefined,
            versionStrategy: withGit ? versionStrategy : undefined,
            qualityToolchain,
            features: {
              docker: withDocker,
              git: withGit,
              gitHooks: withGit && withGitHooks,
              cicd: withGit && withCicd,
              devcontainer: withDevcontainer,
              ide: withIde,
              auth: withAuth,
              rbac: withRbac,
              'api-docs': withSwagger,
              database: database !== 'none' && orm !== 'none',
              testing: true,
            },
            telemetry: { enabled: helpImprove },
            paths: { modules: 'src/modules', templates: 'templates', plugins: 'plugins' },
          });
          await projectFs.write(
            '.editorconfig',
            'root = true\n\n[*]\ncharset = utf-8\nend_of_line = lf\ninsert_final_newline = true\nindent_style = space\nindent_size = 2\n',
          );

          await setupQuality(projectFs, templates, {
            toolchain: qualityToolchain,
            eslint: qualityToolchain === 'eslint',
            prettier: withPrettier,
          });

          await setupNodeToolchain(projectFs, templates, {
            toolchain: nodeToolchain,
            nodeVersion: '22',
          });
        }
        checklist.push({ label: 'Application Generated', ok: true });

        const archEngine = createArchitectureEngine({
          cwd: targetDir,
          filesystem: projectFs,
          templatesRoot: resolveTemplatesRoot(),
        });
        const archResult = await archEngine.setup({
          cwd: targetDir,
          style: architecture as 'modular-monolith',
          appName: projectName,
          backend,
          frontend,
          language: language as 'typescript' | 'javascript',
          dryRun,
        });
        if (!dryRun) {
          const rc = await projectFs.readJson<Record<string, unknown>>('.myclirc.json');
          rc.architectureStyle = archResult.style;
          rc.architectureLabel = archResult.label;
          const paths = (rc.paths as Record<string, string> | undefined) ?? {};
          paths.modules = archResult.modulePaths.modules;
          if (archResult.modulePaths.domain) paths.domain = archResult.modulePaths.domain;
          if (archResult.modulePaths.application)
            paths.application = archResult.modulePaths.application;
          if (archResult.modulePaths.infrastructure) {
            paths.infrastructure = archResult.modulePaths.infrastructure;
          }
          rc.paths = paths;
          await projectFs.writeJson('.myclirc.json', rc);

          const isEnterpriseStyle = !['monolith', 'monorepo', 'polyrepo'].includes(
            archResult.style,
          );
          if (isEnterpriseStyle) {
            const archEngineForLint = createArchitectureEngine({
              cwd: targetDir,
              filesystem: projectFs,
              templatesRoot: resolveTemplatesRoot(),
            });
            await archEngineForLint.setupEslint({ cwd: targetDir, dryRun: false });
          }
        }
        checklist.push({ label: 'Architecture Configured', ok: true });

        if (isEnterpriseSaas) {
          await setupEnterpriseSaas({
            fs: projectFs,
            templates,
            appName: projectName,
            dryRun,
          });
          checklist.push({ label: 'Enterprise SaaS Modules Added', ok: true });
        }

        if (database !== 'none') {
          const templatesRoot = resolveTemplatesRoot();
          const db = createDatabaseManager({
            cwd: targetDir,
            filesystem: projectFs,
            templatesRoot,
          });
          wireDatabasePlugin(
            db,
            database as DatabaseEngine,
            createTemplateEngine({
              filesystem: projectFs,
              templatesRoot,
            }),
          );
          const dbResult = await db.setup({
            cwd: targetDir,
            database: database as DatabaseEngine,
            orm: database === 'redis' ? 'prisma' : (orm as OrmEngine),
            appName: projectName,
            includeAuth: withAuth,
            includeRbac: withRbac,
            dryRun,
          });
          featureDeps.push(dbResult);
          checklist.push({
            label: database === 'redis' ? 'Redis Configured' : 'Database Configured',
            ok: true,
          });
        }

        if (withAuth) {
          const auth = createAuthManager({
            cwd: targetDir,
            filesystem: projectFs,
            templatesRoot: resolveTemplatesRoot(),
          });
          const authResult = await auth.setup({
            cwd: targetDir,
            strategies: ['jwt', 'refresh-token'],
            orm: orm === 'none' ? 'none' : (orm as 'prisma'),
            dryRun,
          });
          featureDeps.push(authResult);
          checklist.push({ label: 'Auth Configured', ok: true });
        }

        if (withRbac) {
          const rbac = createRbacManager({
            cwd: targetDir,
            filesystem: projectFs,
            templatesRoot: resolveTemplatesRoot(),
          });
          const rbacResult = await rbac.setup({
            cwd: targetDir,
            orm: orm === 'none' ? 'none' : (orm as 'prisma'),
            dryRun,
          });
          featureDeps.push(rbacResult);
          checklist.push({ label: 'RBAC Configured', ok: true });
        }

        if (withSwagger) {
          const api = createApiManager({
            cwd: targetDir,
            filesystem: projectFs,
            templatesRoot: resolveTemplatesRoot(),
          });
          const apiResult = await api.generateDocs({
            cwd: targetDir,
            provider: 'swagger',
            title: projectName,
            dryRun,
          });
          featureDeps.push(apiResult);
          await api.generateClients({
            cwd: targetDir,
            postman: true,
            bruno: true,
            title: projectName,
            dryRun,
          });
          checklist.push({ label: 'API Docs Configured', ok: true });
        }

        if (frontend !== 'none') {
          const fe = createFrontendManager({
            cwd: targetDir,
            filesystem: projectFs,
            templatesRoot: resolveTemplatesRoot(),
          });
          const feResult = await fe.setup({
            cwd: targetDir,
            framework: frontend as 'react',
            language: language as 'typescript' | 'javascript',
            appName: projectName,
            dryRun,
          });
          checklist.push({ label: 'Frontend Scaffolded', ok: feResult.files.length > 0 });

          if (uiLibrary !== 'none') {
            const ui = createUiManager({
              cwd: targetDir,
              filesystem: createFileSystem(join(targetDir, 'frontend')),
              templatesRoot: resolveTemplatesRoot(),
            });
            await ui.setup({
              library: uiLibrary as 'tailwind' | 'other',
              packageName: uiLibrary === 'other' ? customUiPackage : undefined,
              targetDir: join(targetDir, 'frontend'),
              dryRun,
              skipInstall: Boolean(ctx.options.skipInstall),
            });
            checklist.push({ label: 'UI Library Configured', ok: true });
          }
        }

        if (withDocker) {
          const docker = createDockerManager({
            cwd: targetDir,
            filesystem: projectFs,
            templatesRoot: resolveTemplatesRoot(),
          });
          await docker.generate({
            cwd: targetDir,
            appName: projectName,
            database:
              database === 'postgresql'
                ? 'postgres'
                : database === 'mysql' || database === 'mariadb'
                  ? 'mysql'
                  : database === 'mongodb'
                    ? 'mongodb'
                    : 'none',
            redis: true,
            mailhog: true,
            dryRun,
          });
          checklist.push({ label: 'Docker Added', ok: true });
        }

        const testing = createTestingManager({
          cwd: targetDir,
          filesystem: projectFs,
          templatesRoot: resolveTemplatesRoot(),
        });
        const testingResult = await testing.setup({
          cwd: targetDir,
          unit: 'vitest',
          integration: true,
          language: language as 'typescript' | 'javascript',
          dryRun,
        });
        featureDeps.push(testingResult);

        if (!dryRun) {
          const merged = mergeDependencyRecords(...featureDeps);
          const prismaScripts =
            database !== 'none' && orm === 'prisma'
              ? {
                  'db:generate': 'prisma generate',
                  'db:push': 'prisma db push',
                  'db:seed': 'tsx prisma/seed.ts',
                }
              : {};
          if (Object.keys(prismaScripts).length > 0) {
            const pkg = await projectFs.readJson<Record<string, unknown>>('package.json');
            const scripts = (pkg.scripts as Record<string, string> | undefined) ?? {};
            Object.assign(scripts, prismaScripts);
            pkg.scripts = scripts;
            await projectFs.writeJson('package.json', pkg);
          }
          await mergeDepsIntoPackageJson(
            targetDir,
            merged.dependencies,
            merged.devDependencies,
            false,
          );
        }

        if (!dryRun) {
          const envDoc = await templates.renderFile('features/env/ENVIRONMENT.md.ejs', {
            data: {
              projectName,
              hasDatabase: database !== 'none',
              hasRedis: withDocker || database === 'redis',
            },
          });
          await projectFs.write('ENVIRONMENT.md', envDoc);
          await writeDefaultDeploymentDoc({
            fs: projectFs,
            templates,
            appName: projectName,
            dryRun,
          });
        }

        if (!ctx.options.skipInstall && !dryRun) {
          const deps = createDependencyManager({ cwd: targetDir });
          await deps.install([], { cwd: targetDir });
          checklist.push({ label: 'Dependencies Installed', ok: true });
        }

        if (withGit && !dryRun) {
          const git = createGitManager({ cwd: targetDir });
          const skipCommunitySecurity = gitProvider === 'github' && withCicd;

          await git.generateCommunityFiles({
            cwd: targetDir,
            appName: projectName,
            templatesRoot,
            defaultBranch,
            commitConvention,
            includeSecurity: !skipCommunitySecurity,
          });
          checklist.push({ label: 'Community Files Generated', ok: true });

          const release = createReleaseManager({
            cwd: targetDir,
            filesystem: projectFs,
            templatesRoot,
          });
          await release.setup({
            appName: projectName,
            strategy: versionStrategy,
            branch: defaultBranch,
            dryRun,
          });
          checklist.push({ label: 'Release Automation Configured', ok: true });

          try {
            await git.init({ cwd: targetDir, defaultBranch });
            await git.generateIgnore(
              [frontend !== 'none' ? 'react' : '', withDocker ? 'docker' : ''].filter(Boolean),
              targetDir,
            );
            await git.generateAttributes(targetDir);

            if (withCicd) {
              if (gitProvider === 'github' || gitProvider === 'skip') {
                const github = createGithubManager({
                  cwd: targetDir,
                  filesystem: projectFs,
                  templatesRoot,
                });
                await github.setup({
                  appName: projectName,
                  packageManager,
                  branch: defaultBranch,
                  includeDeployWorkflow: true,
                  includeRenovate: true,
                });
              } else {
                const cicdProvider = gitProvider === 'azure-devops' ? 'azure' : gitProvider;
                const cicd = createCicdManager({
                  cwd: targetDir,
                  filesystem: projectFs,
                  templatesRoot,
                });
                await cicd.setup({
                  provider: cicdProvider,
                  appName: projectName,
                  packageManager,
                  branch: defaultBranch,
                });
              }
              checklist.push({ label: 'CI/CD Configured', ok: true });
            }

            if (withGitHooks) {
              const hooks = await git.setupHooks({
                cwd: targetDir,
                appName: projectName,
                templatesRoot,
                convention: commitConvention,
                packageManager,
              });
              const pkg = await projectFs.readJson<{
                devDependencies?: Record<string, string>;
                scripts?: Record<string, string>;
                config?: Record<string, unknown>;
              }>('package.json');
              await projectFs.writeJson('package.json', {
                ...pkg,
                devDependencies: { ...pkg.devDependencies, ...hooks.devDependencies },
                scripts: { ...pkg.scripts, ...hooks.scripts },
                config: {
                  ...pkg.config,
                  commitizen: { path: 'cz-conventional-changelog' },
                },
              });
              if (!ctx.options.skipInstall) {
                const deps = createDependencyManager({ cwd: targetDir });
                await deps.install([], { cwd: targetDir, dev: true });
              }
              checklist.push({ label: 'Git Hooks Configured', ok: true });
            }

            try {
              await git.addAll(targetDir);
              await git.commit('Initial commit', targetDir);
              await git.setupBranchStrategy(branchStrategy, targetDir);
              checklist.push({ label: 'Initial Commit Created', ok: true });
            } catch {
              checklist.push({ label: 'Initial Commit Created', ok: false });
            }
            checklist.push({ label: 'Git Initialized', ok: true });

            if (gitProvider !== 'skip') {
              const publishResult = await git.publishToRemote({
                provider: gitProvider,
                name: projectName,
                cwd: targetDir,
                private: Boolean(ctx.options.gitPrivate),
                owner: ctx.options.gitOwner as string | undefined,
                organization: ctx.options.gitOrg as string | undefined,
                project: ctx.options.gitProject as string | undefined,
                branch: defaultBranch,
                commitMessage: 'Initial commit',
                ensureCommit: false,
              });
              checklist.push({
                label: 'Remote Repository',
                ok: publishResult.executed || Boolean(publishResult.url),
              });

              if (
                gitProvider === 'github' &&
                Boolean(ctx.options.labels) &&
                (publishResult.executed || publishResult.pushed)
              ) {
                const github = createGithubManager({
                  cwd: targetDir,
                  filesystem: projectFs,
                  templatesRoot,
                });
                const labels = await github.createLabels({ cwd: targetDir });
                checklist.push({
                  label: 'GitHub Labels',
                  ok: labels.created > 0 || labels.commands.length > 0,
                });
              }
            }
          } catch {
            checklist.push({ label: 'Git Initialized', ok: false });
            // Still write CI/CD + hooks when git init is blocked (restricted sandboxes).
            if (withCicd && (gitProvider === 'github' || gitProvider === 'skip')) {
              const github = createGithubManager({
                cwd: targetDir,
                filesystem: projectFs,
                templatesRoot,
              });
              await github.setup({
                appName: projectName,
                packageManager,
                branch: defaultBranch,
                includeDeployWorkflow: true,
                includeRenovate: true,
              });
              checklist.push({ label: 'CI/CD Configured', ok: true });
            }
            if (withGitHooks) {
              const hooks = await git.setupHooks({
                cwd: targetDir,
                appName: projectName,
                templatesRoot,
                convention: commitConvention,
                packageManager,
              });
              const pkg = await projectFs.readJson<{
                devDependencies?: Record<string, string>;
                scripts?: Record<string, string>;
                config?: Record<string, unknown>;
              }>('package.json');
              await projectFs.writeJson('package.json', {
                ...pkg,
                devDependencies: { ...pkg.devDependencies, ...hooks.devDependencies },
                scripts: { ...pkg.scripts, ...hooks.scripts },
                config: {
                  ...pkg.config,
                  commitizen: { path: 'cz-conventional-changelog' },
                },
              });
              checklist.push({ label: 'Git Hooks Configured', ok: true });
            }
          }
        }

        if ((withIde || withDevcontainer) && !dryRun) {
          const ide = createIdeManager({ cwd: targetDir, templatesRoot: resolveTemplatesRoot() });
          if (withIde && withDevcontainer) {
            await ide.setup({
              appName: projectName,
              includeDevcontainer: true,
              includeVscode: true,
              includeCursor: true,
              useDockerCompose: withDocker,
            });
          } else if (withDevcontainer) {
            await ide.setupDevcontainer({
              appName: projectName,
              useDockerCompose: withDocker,
            });
          } else {
            await ide.setupIde({ appName: projectName });
          }
          checklist.push({ label: 'IDE / DevContainer Configured', ok: true });
        }

        const telemetry = createTelemetryManager({
          cliVersion: engine.app.version,
          enabled: helpImprove,
        });
        if (helpImprove) {
          telemetry.track('create', { applicationType, architecture, language });
        }

        checklist.push({ label: 'Documentation Generated', ok: true });
        spinner.stop(t('create_spinner_done'));
      } catch (error) {
        spinner.error(t('create_spinner_failed'));
        throw error;
      }

      console.log();
      console.log(pc.bold('================================'));
      console.log(pc.bold(t('create_success_title')));
      console.log(pc.bold('================================'));
      console.log();
      for (const item of checklist) {
        console.log(`${item.ok ? pc.green('✔') : pc.red('✖')} ${item.label}`);
      }
      console.log();
      console.log(pc.dim(`${t('create_next_commands')}:`));
      console.log();
      console.log(`  cd ${projectName}`);
      console.log('  my dev');
      console.log('  my test');
      console.log('  my lint');
      console.log('  my build');
      console.log('  my deploy');
      console.log();
      console.log(pc.bold('================================'));
      prompts.outro(t('create_created', { name: projectName }));
    },
  });
}

function backendDependencies(backend: string): Record<string, string> {
  switch (backend) {
    case 'express':
      return { express: '^4.21.2' };
    case 'fastify':
      return { fastify: '^5.2.1' };
    case 'hono':
      return { hono: '^4.6.16' };
    case 'koa':
      return { koa: '^2.15.3' };
    case 'nestjs-style':
      return { 'reflect-metadata': '^0.2.2', tsyringe: '^4.8.0' };
    default:
      return {};
  }
}

const FASTIFY_FEATURES_TS = `/**
 * Feature route plugins — maintained by MyCLI (\`my add auth|rbac|swagger\`).
 */
import type { FastifyInstance } from 'fastify';

// <mycli:feature-imports>
// </mycli:feature-imports>

export async function registerFeatureRoutes(app: FastifyInstance): Promise<void> {
  // <mycli:features>
  // </mycli:features>
}
`;

const FASTIFY_FEATURES_JS = `/**
 * Feature route plugins — maintained by MyCLI (\`my add auth|rbac|swagger\`).
 */

// <mycli:feature-imports>
// </mycli:feature-imports>

export async function registerFeatureRoutes(app) {
  // <mycli:features>
  // </mycli:features>
}
`;

const APP_ENTRY_TEMPLATE = `/**
 * <%= projectName %>
 * Generated by MyCLI
 */
<% if (backend === 'fastify') { %>
import Fastify from 'fastify';
import { registerFeatureRoutes } from './routes/features.js';

const app = Fastify({ logger: true });

app.get('/health', async () => ({ status: 'ok' }));
await registerFeatureRoutes(app);

const port = Number(process.env.PORT ?? <%= port %>);
await app.listen({ port, host: '0.0.0.0' });
<% } else if (backend === 'express') { %>
import express from 'express';

const app = express();
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const port = Number(process.env.PORT ?? <%= port %>);
app.listen(port, () => {
  console.log(\`Listening on http://localhost:\${port}\`);
});
<% } else if (backend === 'hono') { %>
import { serve } from '@hono/node-server';
import { Hono } from 'hono';

const app = new Hono();
app.get('/health', (c) => c.json({ status: 'ok' }));

const port = Number(process.env.PORT ?? <%= port %>);
serve({ fetch: app.fetch, port });
<% } else if (backend === 'koa') { %>
import Koa from 'koa';

const app = new Koa();
app.use(async (ctx) => {
  if (ctx.path === '/health') {
    ctx.body = { status: 'ok' };
    return;
  }
  ctx.body = '<%= projectName %> is running';
});

const port = Number(process.env.PORT ?? <%= port %>);
app.listen(port, () => {
  console.log(\`Listening on http://localhost:\${port}\`);
});
<% } else if (backend === 'nestjs-style') { %>
import 'reflect-metadata';
import { container } from 'tsyringe';

@container.register('AppBootstrap', { useValue: true })
class AppBootstrap {}

export function bootstrap(): void {
  console.log('<%= projectName %> (NestJS-style DI) is ready');
  console.log('Health: configure controllers under src/modules/');
}

bootstrap();
<% } else { %>
console.log('<%= projectName %> is ready');
<% } %>
`;

const README_TEMPLATE = `# <%= projectName %>

Generated by [MyCLI](https://github.com/mycli/mycli).

## Overview

- Application type: **<%= applicationType %>**
- Architecture: **<%= architecture %>**
- Language: **<%= language %>**
- Backend: **<%= backend %>**
- Frontend: **<%= frontend %>**

## Commands

\`\`\`bash
pnpm dev
pnpm test
pnpm lint
pnpm build
\`\`\`

## MyCLI

\`\`\`bash
my make module user
my make crud product
my add auth
my add rbac
my add docker
my doctor
\`\`\`
`;
