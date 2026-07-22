# @mycli/tenancy-engine

Enterprise multi-tenancy for MyCLI (Phase 5).

## CLI

```bash
my add tenancy
my add tenancy --model multi-tenant-saas --mode schema-per-tenant
my add tenancy --model single-tenant
```

## Tenant models

- **single-tenant** — one fixed tenant (apps, internal tools)
- **multi-tenant-saas** — SaaS with per-request tenant resolution

## Database strategies (multi-tenant SaaS)

| Strategy | Generated |
|----------|-----------|
| `shared-db` | Tenant entity, `tenant_id` columns, middleware, filter |
| `schema-per-tenant` | Schema manager, create schema, per-tenant migrations |
| `db-per-tenant` | Connection manager, provisioning, migration runner |

## Layout

```
src/tenancy/
  entities/Tenant.ts
  repositories/tenant.repository.ts
  tenant.context.ts
  tenant.middleware.ts
  tenant.resolver.ts
  schema/ or database/ (strategy-specific)
tests/tenancy/
TENANCY.md
```

## Note

`my add tenancy` via `@mycli/tenancy-engine` is the **enterprise** Phase 5 implementation under `src/tenancy/`.
Legacy platform scaffolding remains at `src/platform/tenancy/` when using older platform flows.
