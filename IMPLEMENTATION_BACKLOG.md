# MyCLI Implementation Backlog (Sprint 7+)

Prioritized work derived from the full spec audit. Each item includes **acceptance criteria** and **files to touch**.

**Legend:** P0 = blocks “production-ready generated apps” · P1 = important spec gap · P2 = polish

**Baseline:** Sprints 1–6 complete (~88–92% structural). Target: **95%+ spec compliance** with real generated-app depth.

---

## Sprint 7 — Auth & RBAC Depth (P0)

### 7.1 OAuth (Google, GitHub, Facebook) — real flows

**Goal:** Generated apps use `arctic` for authorize + callback + token exchange.

| Task | Files |
|------|-------|
| Implement `OAuthService` with arctic clients per provider | `apps/cli/templates/features/auth/oauth.service.ts.ejs` |
| Wire callback routes, state/PKCE, token → user upsert | `apps/cli/templates/features/auth/auth.routes.ts.ejs`, `auth.service.ts.ejs` |
| Add env validation docs | `apps/cli/templates/features/auth/AUTH.md.ejs` |
| Tests for template render + service shape | `packages/auth-manager/tests/auth-manager.test.ts` |

**Accept:** `my add auth` with OAuth selected generates working `/auth/:provider/start` + `/auth/:provider/callback`; integration test mocks arctic.

---

### 7.2 Session auth — Fastify secure session

| Task | Files |
|------|-------|
| Register `@fastify/secure-session` in app bootstrap template | `apps/cli/src/commands/create.ts` (APP_ENTRY_TEMPLATE) or new `features/auth/session.plugin.ts.ejs` |
| Replace stub session service with cookie read/write | `apps/cli/templates/features/auth/session.service.ts.ejs` |
| Login sets session; middleware reads session | `auth.middleware.ts.ejs`, `auth.service.ts.ejs` |

**Accept:** Session strategy login returns Set-Cookie; `GET /auth/me` works with session cookie.

---

### 7.3 Magic link + OTP — verify endpoints + storage

| Task | Files |
|------|-------|
| Token store interface (Prisma + in-memory) | New `magic-link.repository.ts.ejs`, `otp.repository.ts.ejs` |
| Send stub (log in dev, pluggable mail) | `magic-link.service.ts.ejs`, `otp.service.ts.ejs` |
| Verify routes with TTL | `auth.routes.ts.ejs` |
| Prisma models `MagicLinkToken`, `OtpCode` | `features/database/prisma/schema.prisma.ejs` |

**Accept:** `POST /auth/magic-link` + `GET /auth/magic-link/verify?token=` and `POST /auth/otp/verify` with stored codes.

---

### 7.4 MFA (TOTP) + Passkeys (WebAuthn)

| Task | Files |
|------|-------|
| TOTP enroll/verify with `otpauth` or `@otplib/preset-default` | `mfa.service.ts.ejs`, Prisma `User.mfaSecret` |
| WebAuthn register/authenticate via `@simplewebauthn/server` | `passkeys.service.ts.ejs`, `auth.routes.ts.ejs` |
| Prisma `PasskeyCredential` model | `schema.prisma.ejs` |

**Accept:** MFA required on login when enabled; passkey registration uses real challenge/verify.

---

### 7.5 Non-Prisma user persistence

| Task | Files |
|------|-------|
| Drizzle user repository template | `features/auth/user.repository.drizzle.ts.ejs` |
| TypeORM / Mongoose user repo branches | `user.repository.ts.ejs` (conditional blocks) |
| Wire ORM selection in auth-manager | `packages/auth-manager/src/manager.ts` |

**Accept:** `my create --orm drizzle --yes` + `my add auth` uses Drizzle repo, not in-memory Map.

---

### 7.6 RBAC — CLI store ↔ database sync

| Task | Files |
|------|-------|
| `RbacSyncService` reads `.mycli/rbac.json` → upserts to DB | New `packages/rbac-manager/src/sync.ts` |
| Call sync after `my role/permission *` commands | `apps/cli/src/commands/role.ts`, `permission.ts` |
| Optional `my rbac sync` command | New `apps/cli/src/commands/rbac.ts`, register in `commands/index.ts` |
| Seed from JSON on `prisma db seed` | `features/database/prisma/seed.ts.ejs` |

**Accept:** `my permission create user.read` then `my rbac sync` persists to Prisma; seed includes CLI-defined roles.

---

### 7.7 RBAC — all ORM schemas + resource-aware `can()`

| Task | Files |
|------|-------|
| TypeORM entities for RBAC tables | `features/database/typeorm/entities/*.ejs` |
| Mongoose / Sequelize RBAC models | respective `features/database/*/` templates |
| `can(userId, action, resource)` with ownership check | `rbac.service.ts.ejs`, `rbac.middleware.ts.ejs` |

**Accept:** RBAC tables generated for every ORM; `can('update', { type: 'post', ownerId })` respects ownership.

---

## Sprint 8 — Database & ORM Parity (P0)

### 8.1 MikroORM migrations (stop Prisma fallback)

| Task | Files |
|------|-------|
| Add `mikroorm` case in migration planner | `packages/generator-engine/src/migrations/index.ts` |
| MikroORM migration template | `apps/cli/templates/generators/migration/mikroorm.ts.ejs` |
| Tests | `packages/generator-engine/tests/migrations.test.ts` |

**Accept:** `my make migration create_users --orm mikroorm` writes MikroORM migration, not SQL in `prisma/`.

---

### 8.2 Drizzle dialect per database

| Task | Files |
|------|-------|
| Conditional imports: `pg-core`, `mysql-core`, `sqlite-core` | `features/database/drizzle/schema.ts.ejs` |
| `drizzleDialect()` fixes SQL Server mapping | `packages/generator-engine/src/migrations/index.ts`, `database-manager` |

**Accept:** MySQL project gets `drizzle-orm/mysql-core` schema.

---

### 8.3 ORM seeders (beyond Prisma)

| Task | Files |
|------|-------|
| Drizzle seed script template | `features/database/drizzle/seed.ts.ejs` |
| TypeORM / Mongoose seed templates | `features/database/typeorm/seed.ts.ejs`, etc. |
| Wire in database-manager | `packages/database-manager/src/orm/index.ts`, `extra.ts` |

**Accept:** Each ORM gets a runnable seed with admin user + optional RBAC.

---

### 8.4 DatabasePlugin interface — align with spec §54

| Task | Files |
|------|-------|
| Extend interface: `install`, `generateModels`, `generateMigration`, `generateDocker` | `packages/database-manager/src/types.ts` |
| Implement on postgres plugin | `plugins/official/postgres/src/index.ts` |
| Delegate from manager | `packages/database-manager/src/manager.ts` |

**Accept:** Plugin interface matches spec; postgres plugin implements all methods.

---

## Sprint 9 — Generated Project Quality (P0 + P1)

### 9.1 JavaScript project generation

| Task | Files |
|------|-------|
| Branch on `language === 'javascript'`: no tsconfig, `.js` entry | `apps/cli/src/commands/create.ts` |
| JS entry template | `apps/cli/templates/architecture/.../index.js.ejs` or inline |
| Frontend JS variants (optional) | `features/frontend/*/package.json.ejs` |

**Accept:** `my create js-app --yes` with `--language javascript` (new flag) produces runnable JS without TypeScript deps.

---

### 9.2 Emit `biome.json` (+ optional ESLint/Prettier per spec §20)

| Task | Files |
|------|-------|
| Biome config template | `apps/cli/templates/features/quality/biome.json.ejs` |
| ESLint flat config + Prettier (when selected) | `eslint.config.js.ejs`, `.prettierrc.ejs` |
| Quality prompt in create or `my add quality` | `create.ts` or new `add` feature |
| Wire git-hooks lint-staged to biome | `features/git/husky/pre-commit.ejs` |

**Accept:** Generated project `pnpm lint` passes; spec toolchain available.

---

### 9.3 Commitizen + cz-config

| Task | Files |
|------|-------|
| `.cz-config.js` / commitizen in devDeps | `features/git/cz-config.js.ejs` |
| `npm run commit` script | git-manager community setup |
| Docs | `GIT_CICD_GUIDE.md` |

**Accept:** `pnpm commit` launches commitizen with conventional/angular/custom convention.

---

### 9.4 Calendar versioning option

| Task | Files |
|------|-------|
| Prompt in create: semver vs calver | `create.ts`, `locales/*.json` |
| Calver release config template | `features/release/release.calver.config.js.ejs` |
| release-manager branch | `packages/release-manager/src/manager.ts` |

**Accept:** User selects calendar versioning; CHANGESET/release reflects calver.

---

## Sprint 10 — Git, CI/CD & Release Automation (P1)

### 10.1 Bitbucket remote automation

| Task | Files |
|------|-------|
| Bitbucket REST or `bb` CLI adapter | `packages/git-manager/src/providers/bitbucket.ts` (new) |
| Register in providers index | `packages/git-manager/src/providers/index.ts` |
| Tests with mocked API | `packages/git-manager/tests/git-manager.test.ts` |

**Accept:** `my git remote create --provider bitbucket` creates repo + adds remote (with token env).

---

### 10.2 Azure DevOps — complete flow

| Task | Files |
|------|-------|
| Require `--project` flag; `az repos create --project` | `providers/azure-devops.ts` |
| Remote add + push in publish flow | `git-manager/src/manager.ts` |
| CLI flags | `apps/cli/src/commands/git.ts` |

**Accept:** End-to-end publish to Azure DevOps with project/org params.

---

### 10.3 GitHub labels — auto-create via `gh`

| Task | Files |
|------|-------|
| `GithubManager.createLabels()` runs `gh label create` | `packages/github-manager/src/manager.ts` |
| Opt-in flag `--labels` on create/publish | `create.ts`, `git.ts` |
| Keep LABELS.md as fallback doc | existing template |

**Accept:** After publish, repo has bug/feature/documentation/security labels.

---

### 10.4 Renovate + deploy workflow on `my add github`

| Task | Files |
|------|-------|
| Pass `includeRenovate`, `includeDeployWorkflow` from add command | `apps/cli/src/commands/add.ts` |
| Parity with create defaults | `packages/github-manager/src/types.ts` |

**Accept:** `my add github --release --deploy` generates release + deploy + renovate.

---

## Sprint 11 — Runtime Features (P1)

### 11.1 Telemetry transport

| Task | Files |
|------|-------|
| Configurable endpoint (env `MYCLI_TELEMETRY_URL`, default none) | `packages/telemetry-manager/src/index.ts` |
| `flush()` with fetch, batch, retry-off | new `transport.ts` |
| Call flush on CLI shutdown | `packages/cli-engine/src/engine.ts` |
| Privacy doc | `packages/telemetry-manager/README.md` |

**Accept:** Opt-in telemetry sends anonymous payload; disabled by default; no secrets/paths.

---

### 11.2 `my upgrade` — template migration engine

| Task | Files |
|------|-------|
| Versioned migration registry `.mycli/migrations/` | new `packages/upgrade-manager/` or extend config-manager |
| Compare `.mycli` feature versions vs CLI template versions | `apps/cli/src/commands/upgrade.ts` |
| Safe merges: add missing files, never overwrite without `--force` | migration runners |
| Tests | `apps/cli/tests/upgrade.test.ts` |

**Accept:** `my upgrade` adds new template files from v1.0→1.1 without touching user modules.

---

### 11.3 `my doctor` — live checks

| Task | Files |
|------|-------|
| DB connection ping (pg/mysql/mongo from DATABASE_URL) | `apps/cli/src/commands/doctor.ts` |
| `npm audit --json` summary (optional `--skip-audit`) | same |
| Document limits | `FEATURES_GUIDE.md` |

**Accept:** Doctor reports ✔/✖ database reachable; optional audit count.

---

### 11.4 `my security` — scan runners

| Task | Files |
|------|-------|
| Subcommand `my security audit` → npm audit | `apps/cli/src/commands/security.ts` |
| Secret scan (simple regex / optional `@trufflesecurity/trufflehog` plan) | new handler |
| Docs for Snyk/Trivy CI | `features/platform/security/SECURITY.md.ejs` |

**Accept:** `my security audit` runs and reports vulnerability count.

---

## Sprint 12 — Platform & DX (P1 + P2)

### 12.1 Multi-tenancy modes

| Task | Files |
|------|-------|
| Prompt: single-db / schema-per-tenant / db-per-tenant | `apps/cli/src/commands/add.ts` |
| Templates per mode | `features/platform/tenancy/*.ejs` |
| platform-manager config | `packages/platform-manager/src/manager.ts` |

**Accept:** Three tenancy strategies generate distinct middleware + docs.

---

### 12.2 i18n — full CLI coverage

| Task | Files |
|------|-------|
| Extract strings from all commands to locale keys | `apps/cli/src/commands/*.ts`, `locales/en.json` |
| Sync hi/es/fr translations | `locales/hi.json`, etc. |
| Tests | `packages/prompt-engine/tests/i18n.test.ts` |

**Accept:** `MYCLI_LOCALE=hi my doctor` shows Hindi intro/errors.

---

### 12.3 Volta / asdf / `.tool-versions`

| Task | Files |
|------|-------|
| Prompt in create: nvm / volta / asdf | `create.ts` |
| Templates | `.tool-versions.ejs`, `package.json` volta block |
| IDE_GUIDE update | `IDE_GUIDE.md` |

**Accept:** User can generate Volta pin or asdf `.tool-versions`.

---

### 12.4 UI library “Other” in create wizard

| Task | Files |
|------|-------|
| Add “Other” option → package name prompt | `create.ts` |
| Reuse ui-manager npm registry check | `@mycli/ui-manager` |

**Accept:** Create flow installs custom npm UI package when registry exists.

---

## Sprint 13 — Documentation & Repo Hygiene (P2)

### 13.1 Package READMEs (10 missing)

Create README for:

- `packages/backup-manager/`
- `packages/cicd-manager/`
- `packages/cloud-manager/`
- `packages/kubernetes-manager/`
- `packages/github-manager/`
- `packages/marketplace-manager/`
- `packages/registry-manager/`
- `packages/secrets-manager/`
- `packages/ai-manager/`
- `packages/architecture-manager/`

**Accept:** Every `packages/*` has README with commands, outputs, tests.

---

### 13.2 MyCLI repo OSS files

| Task | Files |
|------|-------|
| Root CODE_OF_CONDUCT.md | copy/adapt from template |
| Root SECURITY.md | new |
| `.github/ISSUE_TEMPLATE/`, dependabot, PR template | `.github/` |
| Update CONTRIBUTING.md | link to above |

---

### 13.3 Spec / doc alignment

| Task | Files |
|------|-------|
| Document `apps/cli` vs `packages/cli` | `ARCHITECTURE.md` |
| Document `plugins/plugins.json` location | `PLUGIN_GUIDE.md`, `MARKETPLACE_GUIDE.md` |
| Update COMPLETION_CHECKLIST after each sprint | `COMPLETION_CHECKLIST.md` |

---

## Sprint 14 — Test & E2E Hardening (P2)

### 14.1 Command-level test coverage

| Command group | Test file |
|---------------|-----------|
| `my add auth|rbac|database` (dry-run file lists) | `apps/cli/tests/add.test.ts` (extend) |
| `my make crud|module|migration` | `apps/cli/tests/make.test.ts` (extend) |
| `my git`, `my deploy`, `my security` | new `apps/cli/tests/git.test.ts`, etc. |
| `my rbac sync` | new |

**Accept:** Every top-level command has ≥1 integration test.

---

### 14.2 Generated app E2E smoke

| Task | Files |
|------|-------|
| Script: `my create e2e-app --yes`, install, build, test | `scripts/e2e-generated-app.mjs` |
| CI job (optional, nightly) | `.github/workflows/e2e-generated.yml` |

**Accept:** CI proves a generated API project builds and tests pass.

---

### 14.3 Auth/RBAC integration tests (generated output)

| Task | Files |
|------|-------|
| Render auth templates to temp dir; assert imports compile | `packages/auth-manager/tests/` |
| Same for RBAC sync | `packages/rbac-manager/tests/` |

---

## Suggested Execution Order

```
Sprint 7  → Auth + RBAC (highest user-visible gap)
Sprint 8  → ORM parity (unblocks non-Prisma production apps)
Sprint 9  → JS + quality configs (create wizard completeness)
Sprint 10 → Git/CI polish
Sprint 11 → upgrade, telemetry, doctor, security scans
Sprint 12 → tenancy, i18n, tooling
Sprint 13 → docs
Sprint 14 → test hardening
```

---

## Definition of Done (per sprint)

- [ ] All new code has Vitest coverage
- [ ] Templates use EJS only (no string concat in managers)
- [ ] `pnpm build && pnpm test` green
- [ ] Relevant guide updated (FEATURES_GUIDE, DATABASE_GUIDE, etc.)
- [ ] COMPLETION_CHECKLIST.md status updated
- [ ] No secrets or placeholder `TODO` in generated output

---

## Quick Reference — Files Most Often Touched

| Area | Primary paths |
|------|----------------|
| CLI commands | `apps/cli/src/commands/*.ts` |
| Templates | `apps/cli/templates/features/**`, `generators/**` |
| Managers | `packages/*-manager/src/` |
| Generators | `packages/generator-engine/src/` |
| Plugins | `plugins/official/*/src/index.ts` |
| Tests | `packages/*/tests/`, `apps/cli/tests/` |
| Docs | `*_GUIDE.md`, `docs/` |
| i18n | `locales/*.json` |

---

*Generated from spec audit. Update this file as sprints complete.*
