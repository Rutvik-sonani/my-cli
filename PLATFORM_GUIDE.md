# Platform Features Guide (Phase 13)

MyCLI generates observability, security, tenancy, feature flags, and search modules for production Node.js apps.

## Quick start

```bash
my add observability
my security setup              # or: my add security
my add tenancy
my add feature-flags
my add search --provider meilisearch
my doctor
```

## Features

| Command | Module | Purpose |
|---------|--------|---------|
| `my add observability` | `src/platform/observability/` | Pino logging, OpenTelemetry, `/metrics` |
| `my add security` / `my security setup` | `src/platform/security/` | Helmet, CORS, rate limiting |
| `my add tenancy` | `src/platform/tenancy/` | Multi-tenant context via header |
| `my add feature-flags` | `src/platform/feature-flags/` | JSON-backed feature toggles |
| `my add search` | `src/platform/search/` | Meilisearch or Elasticsearch |

Each command generates source files, `docs/<feature>.md`, env vars in `.env.example`, and updates `PLATFORM.md`.

## Tenancy modes

When adding tenancy, choose an isolation strategy:

```bash
my add tenancy --mode single-db              # default — shared DB, row-level filtering
my add tenancy --mode schema-per-tenant      # PostgreSQL schema per tenant
my add tenancy --mode db-per-tenant          # dedicated DATABASE_URL per tenant
```

| Mode | Generated files | Env vars |
|------|-----------------|----------|
| `single-db` | `tenant.middleware.ts`, context | `TENANT_HEADER`, `DEFAULT_TENANT` |
| `schema-per-tenant` | + `tenant.resolver.ts` (schema) | + `TENANT_SCHEMA_PREFIX` |
| `db-per-tenant` | + `tenant.resolver.ts` (DB URL) | + `DATABASE_URL_<TENANT>` |

The selected mode is stored in `.myclirc.json` under `extensions.tenancyMode` and documented in `docs/tenancy.md`.

## Search providers

```bash
my add search --provider meilisearch    # default
my add search --provider elasticsearch
```

## Feature flag aliases

```bash
my add feature-flags
my add flags              # alias
```

## Manager

| Package | Responsibility |
|---------|----------------|
| `@mycli/platform-manager` | Observability, security, tenancy, feature-flags, search |

Templates live in `apps/cli/templates/features/platform/`.
