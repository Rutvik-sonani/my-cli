import { join } from 'node:path';
import { createAiManager } from '@mycli-cli/ai-manager';
import { createApiManager } from '@mycli-cli/api-manager';
import {
  type AuditStorageBackend,
  createAuditManager,
  normalizeAuditStorage,
} from '@mycli-cli/audit-engine';
import { createAuthManager } from '@mycli-cli/auth-manager';
import { createCicdManager } from '@mycli-cli/cicd-manager';
import type { CliEngine } from '@mycli-cli/cli-engine';
import { defineCommand } from '@mycli-cli/command-engine';
import {
  createComplianceManager,
  normalizeComplianceFrameworks,
} from '@mycli-cli/compliance-engine';
import { createConfigManager } from '@mycli-cli/config-manager';
import { createCqrsManager } from '@mycli-cli/cqrs-engine';
import { createDatabaseManager } from '@mycli-cli/database-manager';
import type { DatabaseEngine, OrmEngine } from '@mycli-cli/database-manager';
import { createDependencyManager } from '@mycli-cli/dependency-manager';
import { createDeploymentManager } from '@mycli-cli/deployment-manager';
import { createDockerManager } from '@mycli-cli/docker-manager';
import {
  type EventSystemProvider,
  createEventSystemManager,
  normalizeEventProvider,
} from '@mycli-cli/event-engine';
import {
  createFeatureFlagManager,
  normalizeFeatureFlagProvider,
} from '@mycli-cli/feature-flag-engine';
import { createFileSystem } from '@mycli-cli/filesystem';
import { createFrontendManager } from '@mycli-cli/frontend-manager';
import type { FrontendFramework } from '@mycli-cli/frontend-manager';
import { createGithubManager } from '@mycli-cli/github-manager';
import { createIdeManager } from '@mycli-cli/ide-manager';
import {
  type IdentityProviderId,
  createEnterpriseAuthManager,
  normalizeIdentityProviders,
} from '@mycli-cli/identity-engine';
import { createKubernetesManager } from '@mycli-cli/kubernetes-manager';
import {
  createObservabilityManager,
  normalizeObservabilityLogger,
} from '@mycli-cli/observability-engine';
import {
  type PlatformFeature,
  type TenancyMode,
  createPlatformManager,
} from '@mycli-cli/platform-manager';
import { createPrivacyManager } from '@mycli-cli/privacy-engine';
import { createRbacManager } from '@mycli-cli/rbac-manager';
import { createReleaseManager } from '@mycli-cli/release-manager';
import { createSearchManager, normalizeSearchProvider } from '@mycli-cli/search-engine';
import { createSecurityManager } from '@mycli-cli/security-engine';
import { type ServiceKind, createServicesManager } from '@mycli-cli/services-manager';
import { createTemplateEngine } from '@mycli-cli/template-engine';
import {
  type TenancyStrategy,
  type TenantModel,
  createTenancyManager,
  normalizeTenancyStrategy,
  normalizeTenantModel,
} from '@mycli-cli/tenancy-engine';
import { createTestingManager } from '@mycli-cli/testing-manager';
import { createUiManager } from '@mycli-cli/ui-manager';
import { resolveTemplatesRoot } from '../paths.js';
import { wireDatabasePlugin } from '../utils/database.js';
import { mergeDepsIntoPackageJson } from '../utils/deps.js';
import { setupQuality } from '../utils/quality.js';

const SERVICE_FEATURES = new Set([
  'cache',
  'queue',
  'events',
  'mail',
  'storage',
  'upload',
  'payment',
]);

const PLATFORM_ALIASES: Record<string, PlatformFeature> = {};

async function installDeps(
  cwd: string,
  deps: Record<string, string>,
  devDeps: Record<string, string>,
  dryRun: boolean,
): Promise<void> {
  await mergeDepsIntoPackageJson(cwd, deps, devDeps, dryRun);
}

export function addCommand(engine: CliEngine) {
  return defineCommand({
    name: 'add',
    description: 'Add a feature to the current project (auth, rbac, database, docker, swagger, …)',
    arguments: [{ name: 'feature', description: 'Feature name', required: true }],
    options: [
      { flags: '--dry-run', description: 'Preview without writing files', defaultValue: false },
      { flags: '--orm', description: 'ORM (prisma|drizzle|typeorm|mongoose|sequelize|mikroorm)' },
      { flags: '--database', description: 'Database engine (postgresql|mysql|mongodb|redis|…)' },
      { flags: '--provider', description: 'API docs provider (swagger|scalar|redoc|openapi)' },
      {
        flags: '--mode',
        description: 'Tenancy strategy (shared-db|schema-per-tenant|db-per-tenant)',
      },
      { flags: '--model', description: 'Tenant model (single-tenant|multi-tenant-saas)' },
      {
        flags: '--providers',
        description:
          'Identity providers (google,azure-ad,okta,keycloak,saml,ldap,active-directory)',
      },
      { flags: '--storage', description: 'Audit storage backend (memory|file)' },
      { flags: '--frameworks', description: 'Compliance frameworks (gdpr,hipaa,soc2,iso27001)' },
      { flags: '--logger', description: 'Observability logger (pino|winston)' },
      { flags: '--unit', description: 'Unit test framework (vitest|jest)' },
      { flags: '--e2e', description: 'E2E framework (playwright|cypress|none)' },
      {
        flags: '--nginx',
        description: 'Include nginx reverse proxy for docker',
        defaultValue: false,
      },
      { flags: '--replicas', description: 'Kubernetes replica count' },
      { flags: '--host', description: 'Ingress host for kubernetes/helm' },
      { flags: '--region', description: 'Cloud region for terraform/deploy' },
      { flags: '--node-version', description: 'Node.js version for CI/CD workflows' },
      {
        flags: '--release',
        description: 'Include release workflow (github feature)',
        defaultValue: false,
      },
      {
        flags: '--deploy',
        description: 'Include deploy workflow (github feature)',
        defaultValue: false,
      },
      {
        flags: '--renovate',
        description: 'Include Renovate config (github feature)',
        defaultValue: false,
      },
      {
        flags: '--strategy',
        description: 'Release version strategy (semver|calver) for release feature',
      },
      {
        flags: '--eslint',
        description: 'Use ESLint instead of Biome (quality feature)',
        defaultValue: false,
      },
      {
        flags: '--prettier',
        description: 'Add Prettier config (quality feature)',
        defaultValue: false,
      },
      {
        flags: '--library',
        description: 'UI library (mui|shadcn|antd|chakra|mantine|tailwind|other)',
      },
      { flags: '--package', description: 'Custom npm package when --library other' },
      {
        flags: '--framework <name>',
        description: 'Frontend framework for `frontend` feature (react|next|vue|nuxt|angular)',
      },
      {
        flags: '--devcontainer',
        description: 'Include DevContainer when adding IDE config',
        defaultValue: false,
      },
    ],
    examples: [
      'my add auth',
      'my add rbac',
      'my add database',
      'my add docker',
      'my add frontend --framework react',
      'my add ui --library tailwind',
      'my add kubernetes',
      'my add helm',
      'my add terraform --provider aws',
      'my add github',
      'my add github --release --deploy',
      'my add cicd --provider gitlab',
      'my add release',
      'my add quality',
      'my add quality --eslint --prettier',
      'my add swagger',
      'my add testing',
      'my add ui --library tailwind',
      'my add devcontainer',
      'my add ide --devcontainer',
      'my add cache',
      'my add queue',
      'my add mail --provider smtp',
      'my add storage --provider s3',
      'my add payment',
      'my add observability --logger pino',
      'my add security',
      'my add tenancy',
      'my add feature-flags --provider database',
      'my add search --provider meilisearch',
      'my add cqrs',
      'my add event-system --provider redis',
      'my add tenancy --model multi-tenant-saas --mode shared-db',
      'my add enterprise-auth --providers google,okta',
      'my add audit --storage memory',
      'my add compliance --frameworks gdpr,soc2',
      'my add privacy',
      'my add ai',
    ],
    async handler(ctx) {
      const t = (key: string, params?: Record<string, string>) => engine.i18n.t(key, params);
      engine.prompts.intro(t('add_intro'));
      const feature = String(ctx.args.feature).toLowerCase();
      const dryRun = Boolean(ctx.options.dryRun);
      const templatesRoot = resolveTemplatesRoot();
      const config = createConfigManager({ cwd: engine.app.cwd });
      await config.load();
      const fs = createFileSystem(engine.app.cwd);
      const projectName = config.get().projectName ?? 'app';
      const orm = (config.get().orm as 'prisma' | 'drizzle' | undefined) ?? 'prisma';

      switch (feature) {
        case 'auth': {
          const strategies = engine.app.interactive
            ? await engine.prompts.multiSelect({
                message: 'Auth strategies',
                options: [
                  { value: 'jwt', label: 'JWT' },
                  { value: 'refresh-token', label: 'Refresh Token' },
                  { value: 'session', label: 'Session' },
                  { value: 'oauth', label: 'OAuth' },
                  { value: 'magic-link', label: 'Magic Link' },
                  { value: 'otp', label: 'OTP' },
                  { value: 'passkeys', label: 'Passkeys' },
                  { value: 'mfa', label: 'MFA' },
                ],
                initialValues: ['jwt', 'refresh-token'],
              })
            : (['jwt', 'refresh-token'] as const);

          const strategyList = [...strategies] as Array<
            | 'jwt'
            | 'refresh-token'
            | 'session'
            | 'oauth'
            | 'magic-link'
            | 'otp'
            | 'passkeys'
            | 'mfa'
          >;

          const oauthProviders =
            strategyList.includes('oauth') && engine.app.interactive
              ? await engine.prompts.multiSelect({
                  message: 'OAuth providers',
                  options: [
                    { value: 'google', label: 'Google' },
                    { value: 'github', label: 'GitHub' },
                    { value: 'facebook', label: 'Facebook' },
                  ],
                  initialValues: ['google', 'github'],
                })
              : [];

          const auth = createAuthManager({
            cwd: engine.app.cwd,
            filesystem: fs,
            templatesRoot,
          });
          const result = await auth.setup({
            strategies: strategyList,
            oauthProviders: oauthProviders as Array<'google' | 'github' | 'facebook'>,
            orm,
            dryRun,
          });
          await installDeps(engine.app.cwd, result.dependencies, result.devDependencies, dryRun);
          config.enableFeature('auth');
          if (!dryRun) await config.save();
          engine.prompts.success(t('add_auth_done', { count: String(result.files.length) }));
          break;
        }
        case 'rbac': {
          const rbac = createRbacManager({
            cwd: engine.app.cwd,
            filesystem: fs,
            templatesRoot,
          });
          const result = await rbac.setup({ orm, dryRun });
          await installDeps(engine.app.cwd, result.dependencies, result.devDependencies, dryRun);
          config.enableFeature('rbac');
          if (!dryRun) await config.save();
          engine.prompts.success(t('add_rbac_done', { count: String(result.files.length) }));
          break;
        }
        case 'database':
        case 'db': {
          const database =
            (ctx.options.database as string | undefined) ??
            config.get().database ??
            (engine.app.interactive
              ? await engine.prompts.select({
                  message: 'Database',
                  options: [
                    { value: 'postgresql', label: 'PostgreSQL' },
                    { value: 'mysql', label: 'MySQL' },
                    { value: 'mariadb', label: 'MariaDB' },
                    { value: 'sqlite', label: 'SQLite' },
                    { value: 'mongodb', label: 'MongoDB' },
                    { value: 'redis', label: 'Redis (cache)' },
                    { value: 'sqlserver', label: 'SQL Server' },
                    { value: 'cockroachdb', label: 'CockroachDB' },
                  ],
                })
              : 'postgresql');

          const selectedOrm =
            (ctx.options.orm as string | undefined) ??
            orm ??
            (database === 'redis'
              ? 'prisma'
              : engine.app.interactive
                ? await engine.prompts.select({
                    message: 'ORM',
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
                  })
                : database === 'mongodb'
                  ? 'mongoose'
                  : 'prisma');

          const includeRbac = config.get().features?.rbac === true;
          const includeAuth = config.get().features?.auth === true;
          const db = createDatabaseManager({
            cwd: engine.app.cwd,
            filesystem: fs,
            templatesRoot,
          });
          wireDatabasePlugin(
            db,
            database as DatabaseEngine,
            createTemplateEngine({ filesystem: fs, templatesRoot }),
          );
          const result = await db.setup({
            database: database as DatabaseEngine,
            orm: selectedOrm as OrmEngine,
            appName: projectName,
            includeAuth,
            includeRbac,
            dryRun,
          });
          await installDeps(engine.app.cwd, result.dependencies, result.devDependencies, dryRun);
          config.set('database', database);
          if (database !== 'redis') {
            config.set('orm', selectedOrm);
          }
          config.enableFeature('database');
          if (!dryRun) await config.save();
          engine.prompts.success(
            t('add_database_done', {
              database,
              orm: selectedOrm,
              count: String(result.files.length),
            }),
          );
          break;
        }
        case 'docker': {
          const dbFeature = config.get().database ?? 'postgresql';
          const docker = createDockerManager({
            cwd: engine.app.cwd,
            filesystem: fs,
            templatesRoot,
          });
          const result = await docker.generate({
            appName: projectName,
            database:
              dbFeature === 'postgresql'
                ? 'postgres'
                : dbFeature === 'mysql' || dbFeature === 'mariadb'
                  ? 'mysql'
                  : dbFeature === 'mongodb'
                    ? 'mongodb'
                    : 'none',
            redis: true,
            mailhog: true,
            nginx: Boolean(ctx.options.nginx),
            dryRun,
          });
          config.enableFeature('docker');
          if (!dryRun) await config.save();
          engine.prompts.success(t('add_docker_done', { count: String(result.files.length) }));
          break;
        }
        case 'kubernetes':
        case 'k8s': {
          const k8s = createKubernetesManager({
            cwd: engine.app.cwd,
            filesystem: fs,
            templatesRoot,
          });
          const result = await k8s.setup({
            appName: projectName,
            replicas: ctx.options.replicas ? Number(ctx.options.replicas) : undefined,
            host: ctx.options.host as string | undefined,
            dryRun,
          });
          config.enableFeature('kubernetes');
          if (!dryRun) await config.save();
          engine.prompts.success(t('add_kubernetes_done', { count: String(result.files.length) }));
          break;
        }
        case 'helm': {
          const k8s = createKubernetesManager({
            cwd: engine.app.cwd,
            filesystem: fs,
            templatesRoot,
          });
          const result = await k8s.setupHelm({
            appName: projectName,
            host: ctx.options.host as string | undefined,
            dryRun,
          });
          config.enableFeature('helm');
          if (!dryRun) await config.save();
          engine.prompts.success(t('add_helm_done', { count: String(result.files.length) }));
          break;
        }
        case 'terraform':
        case 'tf': {
          const provider =
            (ctx.options.provider as string | undefined) ??
            (engine.app.interactive
              ? await engine.prompts.select({
                  message: 'Terraform provider',
                  options: [
                    { value: 'aws', label: 'AWS (ECS Fargate)' },
                    { value: 'gcp', label: 'Google Cloud Run' },
                    { value: 'azure', label: 'Azure Container Apps' },
                  ],
                })
              : 'aws');

          const deploy = createDeploymentManager({
            cwd: engine.app.cwd,
            filesystem: fs,
            templatesRoot,
          });
          const result = await deploy.setupTerraform({
            provider: provider as 'aws' | 'gcp' | 'azure',
            appName: projectName,
            region: (ctx.options.region as string | undefined) ?? undefined,
            dryRun,
          });
          config.enableFeature('terraform');
          config.set('terraformProvider', provider);
          if (!dryRun) await config.save();
          engine.prompts.success(
            t('add_terraform_done', { provider, count: String(result.files.length) }),
          );
          break;
        }
        case 'swagger':
        case 'openapi':
        case 'scalar':
        case 'redoc': {
          const api = createApiManager({
            cwd: engine.app.cwd,
            filesystem: fs,
            templatesRoot,
          });
          const provider =
            (ctx.options.provider as string | undefined) ??
            (feature === 'swagger'
              ? 'swagger'
              : feature === 'openapi'
                ? 'openapi'
                : feature === 'scalar'
                  ? 'scalar'
                  : feature === 'redoc'
                    ? 'redoc'
                    : engine.app.interactive
                      ? await engine.prompts.select({
                          message: 'API docs provider',
                          options: [
                            { value: 'swagger', label: 'Swagger UI' },
                            { value: 'scalar', label: 'Scalar' },
                            { value: 'redoc', label: 'Redoc' },
                            { value: 'openapi', label: 'OpenAPI JSON only' },
                          ],
                        })
                      : 'swagger');
          const result = await api.generateDocs({
            provider: provider as 'swagger' | 'openapi' | 'scalar' | 'redoc',
            title: projectName,
            dryRun,
          });
          const clientFiles = await api.generateClients({
            postman: true,
            bruno: true,
            title: projectName,
            dryRun,
          });
          await installDeps(engine.app.cwd, result.dependencies, result.devDependencies, dryRun);
          config.enableFeature('api-docs');
          if (!dryRun) await config.save();
          engine.prompts.success(
            t('add_api_docs_done', {
              count: String(result.files.length + clientFiles.length),
              provider,
            }),
          );
          break;
        }
        case 'github': {
          const deps = createDependencyManager({ cwd: engine.app.cwd });
          let packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun' = 'pnpm';
          try {
            const detected = await deps.detect();
            if (
              detected.manager === 'npm' ||
              detected.manager === 'pnpm' ||
              detected.manager === 'yarn' ||
              detected.manager === 'bun'
            ) {
              packageManager = detected.manager;
            }
          } catch {
            packageManager =
              (config.get().packageManager?.preferred as typeof packageManager) ?? 'pnpm';
          }

          const github = createGithubManager({
            cwd: engine.app.cwd,
            filesystem: fs,
            templatesRoot,
          });
          const result = await github.setup({
            appName: projectName,
            nodeVersion: (ctx.options.nodeVersion as string | undefined) ?? '22',
            packageManager,
            includeReleaseWorkflow: Boolean(ctx.options.release),
            includeDeployWorkflow: Boolean(ctx.options.deploy),
            includeRenovate: Boolean(ctx.options.renovate) || Boolean(ctx.options.deploy),
            dryRun,
          });
          config.enableFeature('github');
          if (!dryRun) await config.save();
          engine.prompts.success(t('add_github_done', { count: String(result.files.length) }));
          break;
        }
        case 'testing': {
          const unit =
            (ctx.options.unit as 'vitest' | 'jest' | undefined) ??
            (engine.app.interactive
              ? await engine.prompts.select({
                  message: 'Unit test framework',
                  options: [
                    { value: 'vitest', label: 'Vitest' },
                    { value: 'jest', label: 'Jest' },
                  ],
                })
              : 'vitest');

          const e2e =
            (ctx.options.e2e as 'playwright' | 'cypress' | 'none' | undefined) ??
            (engine.app.interactive
              ? await engine.prompts.select({
                  message: 'E2E framework',
                  options: [
                    { value: 'none', label: 'None' },
                    { value: 'playwright', label: 'Playwright' },
                    { value: 'cypress', label: 'Cypress' },
                  ],
                })
              : 'none');

          const testing = createTestingManager({
            cwd: engine.app.cwd,
            filesystem: fs,
            templatesRoot,
          });
          const result = await testing.setup({
            unit: unit as 'vitest' | 'jest',
            e2e: e2e as 'playwright' | 'cypress' | 'none',
            integration: true,
            dryRun,
          });
          await installDeps(engine.app.cwd, result.dependencies, result.devDependencies, dryRun);
          config.enableFeature('testing');
          if (!dryRun) await config.save();
          engine.prompts.success(t('add_testing_done', { count: String(result.files.length) }));
          break;
        }
        case 'cicd': {
          const provider =
            (ctx.options.provider as string | undefined) ??
            (engine.app.interactive
              ? await engine.prompts.select({
                  message: 'CI/CD Provider',
                  options: [
                    { value: 'github', label: 'GitHub Actions' },
                    { value: 'gitlab', label: 'GitLab CI' },
                    { value: 'azure', label: 'Azure Pipelines' },
                    { value: 'bitbucket', label: 'Bitbucket Pipelines' },
                    { value: 'jenkins', label: 'Jenkins' },
                  ],
                })
              : 'github');

          const deps = createDependencyManager({ cwd: engine.app.cwd });
          let packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun' = 'pnpm';
          try {
            const detected = await deps.detect();
            if (
              detected.manager === 'npm' ||
              detected.manager === 'pnpm' ||
              detected.manager === 'yarn' ||
              detected.manager === 'bun'
            ) {
              packageManager = detected.manager;
            }
          } catch {
            packageManager =
              (config.get().packageManager?.preferred as typeof packageManager) ?? 'pnpm';
          }

          const cicd = createCicdManager({
            cwd: engine.app.cwd,
            filesystem: fs,
            templatesRoot,
          });
          const result = await cicd.setup({
            provider: provider as 'github' | 'gitlab' | 'azure' | 'bitbucket' | 'jenkins',
            appName: projectName,
            nodeVersion: (ctx.options.nodeVersion as string | undefined) ?? '22',
            packageManager,
            dryRun,
          });
          config.enableFeature('cicd');
          config.set('cicdProvider', provider);
          if (!dryRun) await config.save();
          engine.prompts.success(
            t('add_cicd_done', { provider, count: String(result.files.length) }),
          );
          break;
        }
        case 'release': {
          const release = createReleaseManager({
            cwd: engine.app.cwd,
            filesystem: fs,
            templatesRoot,
          });
          const strategy =
            (ctx.options.strategy as 'semver' | 'calver' | undefined) ??
            (config.get().extensions?.versionStrategy as 'semver' | 'calver' | undefined) ??
            'semver';
          const result = await release.setup({
            appName: projectName,
            strategy,
            dryRun,
          });
          config.enableFeature('release');
          config.set('extensions', {
            ...config.get().extensions,
            versionStrategy: strategy,
          });
          if (!dryRun) await config.save();
          engine.prompts.success(
            t('add_release_done', { count: String(result.files.length), strategy }),
          );
          break;
        }
        case 'quality': {
          const templates = createTemplateEngine({ filesystem: fs, templatesRoot });
          const useEslint = Boolean(ctx.options.eslint);
          const usePrettier = Boolean(ctx.options.prettier);
          const result = await setupQuality(fs, templates, {
            eslint: useEslint,
            prettier: usePrettier,
            toolchain: useEslint ? 'eslint' : 'biome',
            dryRun,
          });
          await installDeps(engine.app.cwd, {}, result.devDependencies, dryRun);
          if (!dryRun && (await fs.exists('package.json'))) {
            const dm = createDependencyManager({ cwd: engine.app.cwd });
            await dm.updatePackageJson((pkg) => {
              const scripts = (pkg.scripts as Record<string, string> | undefined) ?? {};
              scripts.lint = result.lintScript;
              pkg.scripts = scripts;
              return pkg;
            }, engine.app.cwd);
          }
          config.enableFeature('quality');
          if (!dryRun) await config.save();
          engine.prompts.success(t('add_quality_done', { count: String(result.files.length) }));
          break;
        }
        case 'ui': {
          const library =
            (ctx.options.library as string | undefined) ??
            (engine.app.interactive
              ? await engine.prompts.select({
                  message: 'UI Library',
                  options: [
                    { value: 'tailwind', label: 'Tailwind CSS' },
                    { value: 'shadcn', label: 'Shadcn UI' },
                    { value: 'mui', label: 'MUI' },
                    { value: 'antd', label: 'Ant Design' },
                    { value: 'chakra', label: 'Chakra UI' },
                    { value: 'mantine', label: 'Mantine' },
                    { value: 'other', label: 'Other (npm package)' },
                  ],
                })
              : 'tailwind');

          let packageName = ctx.options.package as string | undefined;
          if (library === 'other' && !packageName && engine.app.interactive) {
            packageName = await engine.prompts.text({
              message: 'npm package name',
              validate: (v) => (v.trim() ? undefined : 'Package name is required'),
            });
          }

          const targetDir = (await fs.exists('frontend'))
            ? join(engine.app.cwd, 'frontend')
            : engine.app.cwd;
          const ui = createUiManager({
            cwd: engine.app.cwd,
            filesystem: createFileSystem(targetDir),
            templateEngine: createTemplateEngine({
              filesystem: createFileSystem(targetDir),
              templatesRoot,
            }),
            templatesRoot,
          });
          const result = await ui.setup({
            library: library as 'tailwind',
            packageName,
            targetDir,
            dryRun,
          });
          config.enableFeature('ui');
          config.set('uiLibrary', library);
          if (!dryRun) await config.save();
          engine.prompts.success(
            t('add_ui_done', {
              library,
              packages: String(result.packages.length),
              count: String(result.files.length),
            }),
          );
          break;
        }
        case 'frontend': {
          const allowed: FrontendFramework[] = ['react', 'next', 'vue', 'nuxt', 'angular'];
          const raw =
            (ctx.options.framework as string | undefined) ??
            (engine.app.interactive
              ? await engine.prompts.select({
                  message: 'Frontend Framework',
                  options: [
                    { value: 'react', label: 'React (Vite)' },
                    { value: 'next', label: 'Next.js' },
                    { value: 'vue', label: 'Vue (Vite)' },
                    { value: 'nuxt', label: 'Nuxt' },
                    { value: 'angular', label: 'Angular' },
                  ],
                })
              : 'react');
          const framework = (allowed.includes(raw as FrontendFramework) ? raw : 'react') as Exclude<
            FrontendFramework,
            'none'
          >;

          const frontend = createFrontendManager({
            cwd: engine.app.cwd,
            filesystem: fs,
            templatesRoot,
          });
          const result = await frontend.setup({
            appName: config.get().projectName ?? 'app',
            framework,
            language: (config.get().generators?.language ??
              config.get().language ??
              'typescript') as 'typescript' | 'javascript',
            dryRun,
          });
          config.enableFeature('frontend');
          config.set('frontend', framework);
          if (!dryRun) await config.save();
          engine.prompts.success(
            t('add_frontend_done', {
              framework,
              count: String(result.files.length),
            }),
          );
          break;
        }
        case 'devcontainer': {
          const deps = createDependencyManager({ cwd: engine.app.cwd });
          let packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun' = 'pnpm';
          try {
            const detected = await deps.detect();
            if (
              detected.manager === 'npm' ||
              detected.manager === 'pnpm' ||
              detected.manager === 'yarn' ||
              detected.manager === 'bun'
            ) {
              packageManager = detected.manager;
            }
          } catch {
            packageManager =
              (config.get().packageManager?.preferred as typeof packageManager) ?? 'pnpm';
          }

          const ide = createIdeManager({
            cwd: engine.app.cwd,
            filesystem: fs,
            templatesRoot,
          });
          const result = await ide.setupDevcontainer({
            appName: projectName,
            nodeVersion: (ctx.options.nodeVersion as string | undefined) ?? '22',
            packageManager,
            useDockerCompose: config.isFeatureEnabled('docker') || (await fs.exists('Dockerfile')),
            dryRun,
          });
          config.enableFeature('devcontainer');
          if (!dryRun) await config.save();
          engine.prompts.success(
            t('add_devcontainer_done', { count: String(result.files.length) }),
          );
          break;
        }
        case 'ide': {
          const deps = createDependencyManager({ cwd: engine.app.cwd });
          let packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun' = 'pnpm';
          try {
            const detected = await deps.detect();
            if (
              detected.manager === 'npm' ||
              detected.manager === 'pnpm' ||
              detected.manager === 'yarn' ||
              detected.manager === 'bun'
            ) {
              packageManager = detected.manager;
            }
          } catch {
            packageManager =
              (config.get().packageManager?.preferred as typeof packageManager) ?? 'pnpm';
          }

          const includeDevcontainer = Boolean(ctx.options.devcontainer);
          const ide = createIdeManager({
            cwd: engine.app.cwd,
            filesystem: fs,
            templatesRoot,
          });
          const result = includeDevcontainer
            ? await ide.setup({
                appName: projectName,
                nodeVersion: (ctx.options.nodeVersion as string | undefined) ?? '22',
                packageManager,
                includeDevcontainer: true,
                includeVscode: true,
                includeCursor: true,
                useDockerCompose:
                  config.isFeatureEnabled('docker') || (await fs.exists('Dockerfile')),
                dryRun,
              })
            : await ide.setupIde({
                appName: projectName,
                nodeVersion: (ctx.options.nodeVersion as string | undefined) ?? '22',
                packageManager,
                dryRun,
              });
          config.enableFeature('ide');
          if (includeDevcontainer) config.enableFeature('devcontainer');
          if (!dryRun) await config.save();
          engine.prompts.success(t('add_ide_done', { count: String(result.files.length) }));
          break;
        }
        case 'ai': {
          const ai = createAiManager({
            cwd: engine.app.cwd,
            filesystem: fs,
            templatesRoot,
          });
          const result = await ai.setup({
            appName: projectName,
            provider:
              (ctx.options.provider as 'openai' | 'anthropic' | 'ollama' | undefined) ?? 'openai',
            dryRun,
          });
          config.enableFeature('ai');
          if (!dryRun) await config.save();
          engine.prompts.success(t('add_ai_done', { count: String(result.files.length) }));
          break;
        }
        case 'event-system':
        case 'events-system':
        case 'event_system': {
          const providerInput =
            (ctx.options.provider as string | undefined) ??
            (engine.app.interactive
              ? await engine.prompts.select({
                  message: 'Event system provider',
                  options: [
                    { value: 'redis', label: 'Redis Streams' },
                    { value: 'kafka', label: 'Apache Kafka' },
                    { value: 'rabbitmq', label: 'RabbitMQ' },
                    { value: 'nats', label: 'NATS' },
                    { value: 'eventbridge', label: 'AWS EventBridge' },
                  ],
                })
              : 'redis');
          const provider =
            normalizeEventProvider(providerInput) ?? (providerInput as EventSystemProvider);

          const eventSystem = createEventSystemManager({
            cwd: engine.app.cwd,
            filesystem: fs,
            templatesRoot,
          });
          const pathConfig = config.get().paths as { eventSystem?: string };
          const language =
            config.get().generators?.language ?? config.get().language ?? 'typescript';
          const result = await eventSystem.setup({
            appName: projectName,
            provider,
            paths: pathConfig,
            language: language === 'javascript' ? 'javascript' : 'typescript',
            dryRun,
          });
          await installDeps(engine.app.cwd, result.dependencies, result.devDependencies, dryRun);
          config.enableFeature('event-system');
          if (!dryRun) {
            config.set('paths', {
              ...config.get().paths,
              eventSystem: pathConfig.eventSystem ?? 'src/event-system',
            });
            config.set('extensions', {
              ...config.get().extensions,
              eventSystemProvider: provider,
            });
            await config.save();
          }
          engine.prompts.success(
            t('add_event_system_done', {
              provider,
              count: String(result.files.length),
            }),
          );
          break;
        }
        case 'audit': {
          const storageInput =
            (ctx.options.storage as string | undefined) ??
            (engine.app.interactive
              ? await engine.prompts.select({
                  message: 'Audit storage backend',
                  options: [
                    { value: 'memory', label: 'In-memory (development)' },
                    { value: 'file', label: 'JSONL file (./data/audit.log.jsonl)' },
                  ],
                })
              : 'memory');
          const storage =
            normalizeAuditStorage(storageInput) ?? (storageInput as AuditStorageBackend);

          const audit = createAuditManager({
            cwd: engine.app.cwd,
            filesystem: fs,
            templatesRoot,
          });
          const pathConfig = config.get().paths as { audit?: string };
          const language =
            config.get().generators?.language ?? config.get().language ?? 'typescript';
          const result = await audit.setup({
            appName: projectName,
            storage,
            paths: pathConfig,
            language: language === 'javascript' ? 'javascript' : 'typescript',
            dryRun,
          });
          config.enableFeature('audit');
          if (!dryRun) {
            config.set('paths', {
              ...config.get().paths,
              audit: pathConfig.audit ?? 'src/audit',
            });
            config.set('extensions', {
              ...config.get().extensions,
              auditStorage: storage,
            });
            await config.save();
          }
          engine.prompts.success(
            t('add_audit_done', {
              storage,
              count: String(result.files.length),
            }),
          );
          break;
        }
        case 'compliance': {
          const frameworksInput =
            (ctx.options.frameworks as string | undefined) ??
            (engine.app.interactive
              ? (
                  await engine.prompts.multiSelect({
                    message: 'Compliance frameworks',
                    options: [
                      { value: 'gdpr', label: 'GDPR' },
                      { value: 'hipaa', label: 'HIPAA' },
                      { value: 'soc2', label: 'SOC 2' },
                      { value: 'iso27001', label: 'ISO 27001' },
                    ],
                    initialValues: ['gdpr'],
                  })
                ).join(',')
              : 'gdpr');
          const frameworks = normalizeComplianceFrameworks(frameworksInput);
          if (frameworks.length === 0) {
            throw new Error(
              'At least one compliance framework is required (gdpr|hipaa|soc2|iso27001)',
            );
          }

          const compliance = createComplianceManager({
            cwd: engine.app.cwd,
            filesystem: fs,
            templatesRoot,
          });
          const pathConfig = config.get().paths as { compliance?: string };
          const language =
            config.get().generators?.language ?? config.get().language ?? 'typescript';
          const result = await compliance.setup({
            appName: projectName,
            frameworks,
            paths: pathConfig,
            language: language === 'javascript' ? 'javascript' : 'typescript',
            dryRun,
          });
          config.enableFeature('compliance');
          if (!dryRun) {
            config.set('paths', {
              ...config.get().paths,
              compliance: pathConfig.compliance ?? 'src/compliance',
            });
            config.set('extensions', {
              ...config.get().extensions,
              complianceFrameworks: frameworks,
            });
            await config.save();
          }
          engine.prompts.success(
            t('add_compliance_done', {
              frameworks: frameworks.join(','),
              count: String(result.files.length),
            }),
          );
          break;
        }
        case 'privacy': {
          const privacy = createPrivacyManager({
            cwd: engine.app.cwd,
            filesystem: fs,
            templatesRoot,
          });
          const pathConfig = config.get().paths as { privacy?: string };
          const language =
            config.get().generators?.language ?? config.get().language ?? 'typescript';
          const result = await privacy.setup({
            appName: projectName,
            paths: pathConfig,
            language: language === 'javascript' ? 'javascript' : 'typescript',
            dryRun,
          });
          config.enableFeature('privacy');
          if (!dryRun) {
            config.set('paths', {
              ...config.get().paths,
              privacy: pathConfig.privacy ?? 'src/privacy',
            });
            await config.save();
          }
          engine.prompts.success(
            t('add_privacy_done', {
              count: String(result.files.length),
            }),
          );
          break;
        }
        case 'feature-flags':
        case 'featureflags':
        case 'flags': {
          const providerInput =
            (ctx.options.provider as string | undefined) ??
            (engine.app.interactive
              ? await engine.prompts.select({
                  message: 'Feature flag provider',
                  options: [
                    { value: 'database', label: 'Database / local JSON (default)' },
                    { value: 'launchdarkly', label: 'LaunchDarkly' },
                    { value: 'unleash', label: 'Unleash' },
                  ],
                })
              : 'database');
          const provider = normalizeFeatureFlagProvider(providerInput);
          if (!provider) {
            throw new Error(
              'Invalid feature flag provider. Use: database | launchdarkly | unleash',
            );
          }

          const featureFlags = createFeatureFlagManager({
            cwd: engine.app.cwd,
            filesystem: fs,
            templatesRoot,
          });
          const pathConfig = config.get().paths as { featureFlags?: string };
          const language =
            config.get().generators?.language ?? config.get().language ?? 'typescript';
          const result = await featureFlags.setup({
            appName: projectName,
            provider,
            paths: pathConfig,
            language: language === 'javascript' ? 'javascript' : 'typescript',
            dryRun,
          });
          await installDeps(engine.app.cwd, result.dependencies, result.devDependencies, dryRun);
          config.enableFeature('feature-flags');
          if (!dryRun) {
            config.set('paths', {
              ...config.get().paths,
              featureFlags: pathConfig.featureFlags ?? 'src/feature-flags',
            });
            config.set('extensions', {
              ...config.get().extensions,
              featureFlagProvider: provider,
            });
            await config.save();
          }
          engine.prompts.success(
            t('add_feature_flags_done', {
              provider,
              count: String(result.files.length),
            }),
          );
          break;
        }
        case 'observability': {
          const loggerInput =
            (ctx.options.logger as string | undefined) ??
            (engine.app.interactive
              ? await engine.prompts.select({
                  message: 'Logging library',
                  options: [
                    { value: 'pino', label: 'Pino (JSON, high performance)' },
                    { value: 'winston', label: 'Winston' },
                  ],
                })
              : 'pino');
          const logger = normalizeObservabilityLogger(loggerInput);
          if (!logger) {
            throw new Error('Invalid observability logger. Use: pino | winston');
          }

          const observability = createObservabilityManager({
            cwd: engine.app.cwd,
            filesystem: fs,
            templatesRoot,
          });
          const pathConfig = config.get().paths as { observability?: string };
          const language =
            config.get().generators?.language ?? config.get().language ?? 'typescript';
          const result = await observability.setup({
            appName: projectName,
            logger,
            paths: pathConfig,
            language: language === 'javascript' ? 'javascript' : 'typescript',
            dryRun,
          });
          await installDeps(engine.app.cwd, result.dependencies, result.devDependencies, dryRun);
          config.enableFeature('observability');
          if (!dryRun) {
            config.set('paths', {
              ...config.get().paths,
              observability: pathConfig.observability ?? 'src/observability',
            });
            config.set('extensions', {
              ...config.get().extensions,
              observabilityLogger: logger,
            });
            await config.save();
          }
          engine.prompts.success(
            t('add_observability_done', {
              logger,
              count: String(result.files.length),
            }),
          );
          break;
        }
        case 'security': {
          const security = createSecurityManager({
            cwd: engine.app.cwd,
            filesystem: fs,
            templatesRoot,
          });
          const pathConfig = config.get().paths as { security?: string };
          const language =
            config.get().generators?.language ?? config.get().language ?? 'typescript';
          const result = await security.setup({
            appName: projectName,
            paths: pathConfig,
            language: language === 'javascript' ? 'javascript' : 'typescript',
            dryRun,
          });
          await installDeps(engine.app.cwd, result.dependencies, result.devDependencies, dryRun);
          config.enableFeature('security');
          if (!dryRun) {
            config.set('paths', {
              ...config.get().paths,
              security: pathConfig.security ?? 'src/security',
            });
            await config.save();
          }
          engine.prompts.success(
            t('add_security_done', {
              count: String(result.files.length),
            }),
          );
          break;
        }
        case 'search': {
          const providerInput =
            (ctx.options.provider as string | undefined) ??
            (engine.app.interactive
              ? await engine.prompts.select({
                  message: 'Search provider',
                  options: [
                    { value: 'meilisearch', label: 'Meilisearch' },
                    { value: 'elasticsearch', label: 'Elasticsearch' },
                    { value: 'algolia', label: 'Algolia' },
                  ],
                })
              : 'meilisearch');
          const provider = normalizeSearchProvider(providerInput);
          if (!provider) {
            throw new Error('Invalid search provider. Use: meilisearch | elasticsearch | algolia');
          }

          const search = createSearchManager({
            cwd: engine.app.cwd,
            filesystem: fs,
            templatesRoot,
          });
          const pathConfig = config.get().paths as { search?: string };
          const language =
            config.get().generators?.language ?? config.get().language ?? 'typescript';
          const result = await search.setup({
            appName: projectName,
            provider,
            paths: pathConfig,
            language: language === 'javascript' ? 'javascript' : 'typescript',
            dryRun,
          });
          await installDeps(engine.app.cwd, result.dependencies, result.devDependencies, dryRun);
          config.enableFeature('search');
          if (!dryRun) {
            config.set('paths', {
              ...config.get().paths,
              search: pathConfig.search ?? 'src/search',
            });
            config.set('extensions', {
              ...config.get().extensions,
              searchProvider: provider,
            });
            await config.save();
          }
          engine.prompts.success(
            t('add_search_done', {
              provider,
              count: String(result.files.length),
            }),
          );
          break;
        }
        case 'enterprise-auth':
        case 'enterprise_auth':
        case 'identity': {
          const providersInput =
            (ctx.options.providers as string | undefined) ??
            (engine.app.interactive
              ? (
                  await engine.prompts.multiSelect({
                    message: 'Identity providers',
                    options: [
                      { value: 'google', label: 'Google (OIDC)' },
                      { value: 'azure-ad', label: 'Azure AD (OIDC)' },
                      { value: 'okta', label: 'Okta (OIDC)' },
                      { value: 'keycloak', label: 'Keycloak (OIDC)' },
                      { value: 'saml', label: 'SAML 2.0' },
                      { value: 'ldap', label: 'LDAP' },
                      { value: 'active-directory', label: 'Active Directory (LDAP)' },
                    ],
                    initialValues: ['google'],
                  })
                ).join(',')
              : 'google');
          const providers = normalizeIdentityProviders(providersInput);
          if (providers.length === 0) {
            throw new Error('At least one identity provider is required');
          }

          const identity = createEnterpriseAuthManager({
            cwd: engine.app.cwd,
            filesystem: fs,
            templatesRoot,
          });
          const pathConfig = config.get().paths as { identity?: string };
          const language =
            config.get().generators?.language ?? config.get().language ?? 'typescript';
          const result = await identity.setup({
            appName: projectName,
            providers: providers as IdentityProviderId[],
            paths: pathConfig,
            language: language === 'javascript' ? 'javascript' : 'typescript',
            dryRun,
          });
          await installDeps(engine.app.cwd, result.dependencies, result.devDependencies, dryRun);
          config.enableFeature('enterprise-auth');
          if (!dryRun) {
            config.set('paths', {
              ...config.get().paths,
              identity: pathConfig.identity ?? 'src/identity',
            });
            config.set('extensions', {
              ...config.get().extensions,
              identityProviders: providers,
            });
            await config.save();
          }
          engine.prompts.success(
            t('add_enterprise_auth_done', {
              providers: providers.join(', '),
              count: String(result.files.length),
            }),
          );
          break;
        }
        case 'tenancy': {
          const modelInput =
            (ctx.options.model as string | undefined) ??
            (engine.app.interactive
              ? await engine.prompts.select({
                  message: 'Tenant model',
                  options: [
                    { value: 'single-tenant', label: 'Single Tenant' },
                    { value: 'multi-tenant-saas', label: 'Multi Tenant SaaS' },
                  ],
                })
              : 'multi-tenant-saas');
          const model = normalizeTenantModel(modelInput) ?? (modelInput as TenantModel);

          let strategy: TenancyStrategy = 'shared-db';
          if (model === 'multi-tenant-saas') {
            const strategyInput =
              (ctx.options.mode as string | undefined) ??
              (engine.app.interactive
                ? await engine.prompts.select({
                    message: 'Database strategy',
                    options: [
                      { value: 'shared-db', label: 'Shared Database (tenant_id columns)' },
                      { value: 'schema-per-tenant', label: 'Schema Per Tenant' },
                      { value: 'db-per-tenant', label: 'Database Per Tenant' },
                    ],
                  })
                : 'shared-db');
            strategy =
              normalizeTenancyStrategy(strategyInput) ?? (strategyInput as TenancyStrategy);
          }

          const tenancy = createTenancyManager({
            cwd: engine.app.cwd,
            filesystem: fs,
            templatesRoot,
          });
          const pathConfig = config.get().paths as { tenancy?: string };
          const language =
            config.get().generators?.language ?? config.get().language ?? 'typescript';
          const result = await tenancy.setup({
            appName: projectName,
            model,
            strategy,
            paths: pathConfig,
            language: language === 'javascript' ? 'javascript' : 'typescript',
            dryRun,
          });
          config.enableFeature('tenancy');
          if (!dryRun) {
            const legacyMode = strategy === 'shared-db' ? 'single-db' : strategy;
            config.set('paths', {
              ...config.get().paths,
              tenancy: pathConfig.tenancy ?? 'src/tenancy',
            });
            config.set('extensions', {
              ...config.get().extensions,
              tenantModel: model,
              tenancyStrategy: strategy,
              tenancyMode: legacyMode,
            });
            await config.save();
          }
          engine.prompts.success(
            t('add_tenancy_done', {
              model,
              strategy,
              count: String(result.files.length),
            }),
          );
          break;
        }
        case 'cqrs': {
          const cqrs = createCqrsManager({
            cwd: engine.app.cwd,
            filesystem: fs,
            templatesRoot,
          });
          const pathConfig = config.get().paths as {
            cqrs?: string;
            application?: string;
          };
          const language =
            config.get().generators?.language ?? config.get().language ?? 'typescript';
          const result = await cqrs.setup({
            appName: projectName,
            paths: pathConfig,
            language: language === 'javascript' ? 'javascript' : 'typescript',
            dryRun,
          });
          config.enableFeature('cqrs');
          if (!dryRun) {
            config.set('paths', {
              ...config.get().paths,
              application: pathConfig.application ?? 'src/application',
              cqrs: pathConfig.cqrs ?? 'src/cqrs',
            });
            await config.save();
          }
          engine.prompts.success(t('add_cqrs_done', { count: String(result.files.length) }));
          break;
        }
        default: {
          const platformFeature = PLATFORM_ALIASES[feature];
          if (platformFeature) {
            const platform = createPlatformManager({
              cwd: engine.app.cwd,
              filesystem: fs,
              templatesRoot,
            });
            let tenancyMode: TenancyMode | undefined;
            if (platformFeature === 'tenancy') {
              tenancyMode =
                (ctx.options.mode as TenancyMode | undefined) ??
                (engine.app.interactive
                  ? ((await engine.prompts.select({
                      message: 'Tenancy strategy',
                      options: [
                        {
                          value: 'single-db',
                          label: 'Single database (shared DB, app-level filtering)',
                        },
                        {
                          value: 'schema-per-tenant',
                          label: 'Schema per tenant (PostgreSQL schemas)',
                        },
                        {
                          value: 'db-per-tenant',
                          label: 'Database per tenant (separate DATABASE_URL)',
                        },
                      ],
                    })) as TenancyMode)
                  : 'single-db');
            }
            const result = await platform.setup({
              feature: platformFeature,
              appName: projectName,
              provider: ctx.options.provider as string | undefined,
              tenancyMode,
              dryRun,
            });
            await installDeps(engine.app.cwd, result.dependencies, result.devDependencies, dryRun);
            config.enableFeature(platformFeature);
            if (tenancyMode) {
              config.set('extensions', { ...config.get().extensions, tenancyMode });
            }
            if (!dryRun) await config.save();
            engine.prompts.success(
              t('add_platform_done', {
                feature: platformFeature,
                count: String(result.files.length),
              }),
            );
            break;
          }

          if (SERVICE_FEATURES.has(feature)) {
            const services = createServicesManager({
              cwd: engine.app.cwd,
              filesystem: fs,
              templatesRoot,
            });
            const result = await services.setup({
              service: feature as ServiceKind,
              appName: projectName,
              provider: ctx.options.provider as string | undefined,
              dryRun,
            });
            await installDeps(engine.app.cwd, result.dependencies, result.devDependencies, dryRun);
            config.enableFeature(feature);
            if (!dryRun) await config.save();
            engine.prompts.success(
              t('add_service_done', { feature, count: String(result.files.length) }),
            );
            break;
          }
          engine.prompts.error(t('add_unknown_feature', { feature }));
          engine.prompts.note(
            'auth | rbac | database | docker | kubernetes | helm | terraform | swagger | github | cicd | release | quality | testing | frontend | ui | devcontainer | ide | cache | queue | events | mail | storage | upload | payment | observability | security | tenancy | feature-flags | search | cqrs | event-system | enterprise-auth | audit | compliance | privacy | ai',
            t('add_supported_features'),
          );
          throw new Error(`Unknown feature: ${feature}`);
        }
      }
    },
  });
}
