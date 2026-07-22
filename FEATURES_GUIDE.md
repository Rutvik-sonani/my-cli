# Features Guide (Phase 3)

Phase 3 adds production-ready **auth**, **RBAC**, **database/ORM**, **API documentation**, and **testing** scaffolds — all generated from EJS templates (no string-concat stubs).

## Quick start

```bash
my create my-api --yes --skip-install
cd my-api

my add database --orm prisma --database postgresql
my add auth
my add rbac
my add swagger --provider swagger
my add testing --unit vitest --e2e playwright

my role create admin
my permission create user.read
my permission assign admin --permission user.read
my role assign user-1 --role admin
```

---

## Auto-registration

`my add auth`, `my add rbac`, and `my add swagger` automatically:

1. Export the module from `src/modules/index.ts` (auth/rbac)
2. Register Fastify plugins in `src/routes/features.ts`
3. Wire `registerFeatureRoutes(app)` from the generated Fastify entrypoint

```ts
// src/routes/features.ts (maintained by MyCLI)
await registerAuthRoutes(app);
await registerRbacRoutes(app);
await registerDocsRoutes(app);
```

---

## Authentication (`my add auth`)

Generates a full auth module under `src/modules/auth/`.

### Strategies (multi-select when interactive)

| Strategy | Generated artifacts |
|----------|---------------------|
| `jwt` | `token.service.ts`, bearer middleware |
| `refresh-token` | refresh endpoint, token rotation |
| `session` | `session.service.ts`, session env vars |
| `oauth` | `oauth.service.ts`, provider env vars |
| `magic-link` | `magic-link.service.ts` |
| `otp` | `otp.service.ts` |
| `passkeys` | scaffold hooks |
| `mfa` | `mfa.service.ts` |

### Endpoints

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh` (when refresh-token enabled)
- `GET /auth/me` (protected)

### Dependencies

- `jose` — JWT sign/verify
- `@prisma/client` — when ORM is prisma

### Files

```
src/modules/auth/
  auth.controller.ts
  auth.service.ts
  auth.middleware.ts
  auth.guard.ts
  token.service.ts
  password.service.ts
  user.repository.ts
  auth.routes.ts
  index.ts
AUTH.md
.env.example  (appended with JWT_* vars)
```

---

## RBAC (`my add rbac`)

Generates role/permission module and Prisma models when database is configured.

### CLI commands

```bash
my role create admin --description "Administrator"
my role list
my role assign <userId> --role admin

my permission create user.read
my permission list
my permission assign admin --permission user.read
```

Role/permission state is stored in `.mycli/rbac.json` and can be synced to the database via seeders.

### Prisma models (when `includeRbac: true`)

- `Role`, `Permission`, `RolePermission`, `UserRole`

### Middleware

```ts
import { createRbacMiddleware } from './modules/rbac/index.js';
const rbac = createRbacMiddleware(new RbacService());
app.get('/admin', { preHandler: [authMiddleware, rbac.role('admin')] }, handler);
```

---

## Database (`my add database`)

Aliases: `my add db`

### Supported combinations

| Database | ORM | Status |
|----------|-----|--------|
| PostgreSQL | Prisma | ✅ full schema + client |
| PostgreSQL | Drizzle | ✅ schema + drizzle.config |
| MySQL | Prisma/Drizzle | ✅ env + templates |
| SQLite | Prisma/Drizzle | ✅ |

### Generated files (Prisma)

```
prisma/schema.prisma    # User, RefreshToken, optional RBAC models
prisma/seed.ts
src/database/prisma.client.ts
.env / .env.example
DATABASE.md
docs/database-postgres.md  (with postgres plugin)
```

### Options

```bash
my add database --database postgresql --orm prisma
my add database --database sqlite --orm drizzle
```

---

## API Documentation (`my add swagger`)

Aliases: `my add openapi`, `my add scalar`, `my add redoc`

### Providers

| Provider | Package | Route |
|----------|---------|-------|
| `swagger` | `@fastify/swagger-ui` | `/docs` |
| `scalar` | `@scalar/fastify-api-reference` | `/docs` |
| `redoc` | `@fastify/static` + Redoc CDN | `/docs` |
| `openapi` | none (JSON only) | `/openapi.json` |

Also generates Postman (`postman/collection.json`) and Bruno (`bruno/`) clients.

```bash
my add swagger --provider scalar
```

---

## Testing (`my add testing`)

### Unit frameworks

- **vitest** (default) — `vitest.config.ts`
- **jest** — `jest.config.ts` with `ts-jest`

### Integration

- **supertest** — `tests/integration/health.test.ts`

### E2E

- **playwright** — `playwright.config.ts`, `tests/e2e/health.spec.ts`
- **cypress** — `cypress.config.ts`

```bash
my add testing --unit jest --e2e playwright
```

---

## Create wizard integration

When running `my create` interactively (without `--yes`), you can opt in to:

- Authentication (JWT + refresh)
- RBAC (requires auth)
- Swagger API docs

These are applied automatically during project generation.

---

## Official plugins

| Plugin | Command equivalent |
|--------|-------------------|
| `@mycli/auth` | `my add auth` |
| `@mycli/rbac` | `my add rbac` |
| `@mycli/prisma` | `my add database --orm prisma` |
| `@mycli/postgres` | `my add database --database postgresql` |
| `@mycli/swagger` | `my add swagger` |

Install via `my plugin install @mycli/auth`.

---

## Architecture

All feature managers follow the same pattern:

```
my add auth
  → AuthManager.setup()
  → TemplateEngine.renderFile('features/auth/*.ejs')
  → FileSystem.write()
  → dependency-manager updates package.json
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full layering diagram.

---

## Runtime diagnostics

### `my doctor`

Checks Node.js, package manager, Git, Docker, environment files, **database TCP connectivity** (from `DATABASE_URL`), and dependency audit summary.

```bash
my doctor
my doctor --skip-audit
```

Database check opens a TCP connection to the host/port parsed from `DATABASE_URL` (PostgreSQL, MySQL, MongoDB). It does not authenticate or run queries.

### `my security`

| Action | Description |
|--------|-------------|
| `my security setup` | Helmet, CORS, rate limiting scaffolds |
| `my security audit` | Runs `npm`/`pnpm` audit and reports vulnerability counts |
| `my security scan-secrets` | Regex scan for likely secrets under the project tree |

### `my upgrade`

Safely adds missing MyCLI scaffold files (ENVIRONMENT.md, biome.json, .editorconfig) without touching `src/modules/`. State is tracked in `.mycli/upgrade-state.json`.

```bash
my upgrade
my upgrade --dry-run
my upgrade --force
```
