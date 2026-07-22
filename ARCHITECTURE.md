# Architecture

MyCLI is a pnpm + Turborepo monorepo of independent TypeScript packages.

## CLI layout: `apps/cli` vs `packages/cli-engine`

| Path | Role |
|------|------|
| **`apps/cli`** | Shipped binary (`my`). Command handlers, EJS templates (`apps/cli/templates/`), locales, Vitest integration tests, and build scripts that copy templates/locales to `dist/`. |
| **`packages/cli-engine`** | Reusable CLI orchestrator — wires `ApplicationContext`, command registry, prompts, config, plugins, and telemetry. No templates or user-facing commands. |
| **`packages/*-manager`** | Domain logic consumed by command handlers (auth, docker, git, …). Managers render templates; they do not parse argv. |
| **`packages/command-engine`** | argv parsing and command registration primitives used by both `cli-engine` and plugins. |

There is **no** `packages/cli` package. The executable lives in `apps/cli`; library consumers import `@mycli-cli/cli-engine` and individual managers.

```
apps/cli/src/commands/*.ts  →  @mycli-cli/*-manager  →  @mycli-cli/template-engine  →  apps/cli/templates/
         ↓
  @mycli-cli/cli-engine (orchestration)
```

## Layering

```
Command → Handler → Service/Manager → Generator → TemplateEngine → FileSystem
```

## Core packages

| Package | Responsibility |
|---------|----------------|
| `@mycli-cli/core` | Context, DI, events, logger, errors, utilities |
| `@mycli-cli/cli-engine` | CLI orchestration |
| `@mycli-cli/command-engine` | Command registry & argv parsing |
| `@mycli-cli/prompt-engine` | Interactive prompts |
| `@mycli-cli/template-engine` | EJS template rendering |
| `@mycli-cli/generator-engine` | Artisan-style generators |
| `@mycli-cli/filesystem` | Safe filesystem I/O |
| `@mycli-cli/config-manager` | `.myclirc.json` configuration |
| `@mycli-cli/plugin-system` | Plugin discovery & lifecycle |
| `@mycli-cli/dependency-manager` | npm/pnpm/yarn/bun |

## Feature managers (Phase 3)

| Package | Responsibility |
|---------|----------------|
| `@mycli-cli/auth-manager` | JWT/OAuth/session auth modules via EJS templates |
| `@mycli-cli/rbac-manager` | Roles, permissions, middleware, CLI store |
| `@mycli-cli/database-manager` | Prisma/Drizzle schemas, env, postgres plugin |
| `@mycli-cli/api-manager` | Swagger/Scalar/Redoc, Postman/Bruno clients |
| `@mycli-cli/testing-manager` | Vitest/Jest, Supertest, Playwright/Cypress |

Templates live in `apps/cli/templates/features/{auth,rbac,database,api-docs,testing}/`.

## Infrastructure managers (Phase 4)

| Package | Responsibility |
|---------|----------------|
| `@mycli-cli/docker-manager` | Dockerfile, Compose, nginx via EJS templates |
| `@mycli-cli/kubernetes-manager` | K8s manifests and Helm charts |
| `@mycli-cli/deployment-manager` | Terraform (AWS/GCP/Azure) and PaaS configs |

Templates live in `apps/cli/templates/features/{docker,kubernetes,helm,terraform,deploy}/`.

See [INFRA_GUIDE.md](./INFRA_GUIDE.md) for commands and output paths.

## Git & CI/CD managers (Phase 5)

| Package | Responsibility |
|---------|----------------|
| `@mycli-cli/github-manager` | GitHub workflows, dependabot, SECURITY, PR template |
| `@mycli-cli/cicd-manager` | CI/CD for GitHub, GitLab, Azure, Bitbucket, Jenkins |
| `@mycli-cli/release-manager` | Changesets, changelog, semantic-release config |
| `@mycli-cli/git-manager` | Local git init, remotes, provider automation (`gh`/`glab`) |
| `@mycli-cli/ide-manager` | DevContainer, VS Code, and Cursor IDE scaffolding |
| `@mycli-cli/services-manager` | Cache, queue, events, mail, storage, payment services |
| `@mycli-cli/platform-manager` | Observability, security, tenancy, feature-flags, search |
| `@mycli-cli/ai-manager` | AI-assisted scaffolding and generation |
| `@mycli-cli/plugin-sdk` | Community plugin authoring utilities |

Templates live in `apps/cli/templates/features/{github,cicd,release}/`.

See [GIT_CICD_GUIDE.md](./GIT_CICD_GUIDE.md) for commands and output paths.

## Cloud deployment managers (Phase 6)

| Package | Responsibility |
|---------|----------------|
| `@mycli-cli/cloud-manager` | Runtime deploy push, status, logs, rollback, destroy |
| `@mycli-cli/secrets-manager` | Environment secrets planning and sync |
| `@mycli-cli/deployment-manager` | Static config + `validateSetup()` |

Templates live in `apps/cli/templates/features/cloud/`.

See [CLOUD_DEPLOY_GUIDE.md](./CLOUD_DEPLOY_GUIDE.md) for runtime deploy commands.

## Plugin marketplace managers (Phase 7)

| Package | Responsibility |
|---------|----------------|
| `@mycli-cli/registry-manager` | Plugin catalog search, get, publish, path resolution |
| `@mycli-cli/marketplace-manager` | Install, update, uninstall, publish orchestration |
| `@mycli-cli/plugin-system` | Plugin discovery, load, lifecycle, command registration |

See [MARKETPLACE_GUIDE.md](./MARKETPLACE_GUIDE.md) and [PLUGIN_GUIDE.md](./PLUGIN_GUIDE.md).

## Frontend & architecture managers (Phase 8)

| Package | Responsibility |
|---------|----------------|
| `@mycli-cli/frontend-manager` | React, Next.js, Vue, Nuxt, Angular scaffolds via EJS |
| `@mycli-cli/ui-manager` | UI library install + config (Tailwind, Shadcn, MUI, …) |
| `@mycli-cli/architecture-manager` | Monolith, modular-monolith, microservice, monorepo, polyrepo layouts |

Templates live in `apps/cli/templates/features/frontend/`, `features/ui/`, and `architecture/`.

CLI: `my add ui`, `my dev`, `my test`, `my lint`, `my build`, `my create --app-type full-stack`.

## Database & ORM managers (Phase 9)

| Package | Responsibility |
|---------|----------------|
| `@mycli-cli/database-manager` | All ORMs (Prisma, Drizzle, TypeORM, Mongoose, Sequelize, MikroORM) |
| Database plugins | Per-engine docs + env for PostgreSQL, MySQL, MongoDB, Redis, … |

See [DATABASE_GUIDE.md](./DATABASE_GUIDE.md).

Managers encapsulate domain generation (auth, rbac, docker, database, deployment, …). They depend on the template engine and filesystem — never hardcode file contents via string concatenation in call sites when a template exists.

## Plugin model

Everything extendable is a plugin:

```ts
interface Plugin {
  name: string;
  version: string;
  install?(ctx): void | Promise<void>;
  uninstall?(ctx): void | Promise<void>;
  commands?(): CommandDefinition[];
  templates?(): string[];
  generators?(): string[];
  dependencies?(): Record<string, string>;
  hooks?(): PluginHooks;
}
```

## Dependency injection

`ApplicationContext` owns a `Container`. Engines register services as singletons. Commands resolve collaborators through the CLI engine rather than importing globals.

## Events

Typed `EventBus` emits `command:*`, `plugin:*`, `generator:*`, and `app:*` lifecycle events for telemetry and hooks.
