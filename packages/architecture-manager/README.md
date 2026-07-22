# @mycli-cli/architecture-manager

Legacy layout scaffolding for **monolith**, **monorepo**, and **polyrepo** during project creation.

> **Enterprise architecture styles** (MVC, Clean Architecture, Hexagonal, DDD, Microservice, Modular Monolith) are handled by [`@mycli-cli/architecture-engine`](../architecture-engine/README.md).

## CLI commands

Architecture style is selected during `my create` (interactive or `--architecture-style`):

| Type | Flag value | Package |
|------|------------|---------|
| MVC | `mvc` | architecture-engine |
| Modular Monolith | `modular-monolith` | architecture-engine |
| Clean Architecture | `clean-architecture` | architecture-engine |
| Hexagonal | `hexagonal` | architecture-engine |
| Domain Driven Design | `domain-driven-design` | architecture-engine |
| Microservice | `microservice` | architecture-engine |
| Monolith | `monolith` | architecture-manager (legacy) |
| Monorepo | `monorepo` | architecture-manager |
| Polyrepo | `polyrepo` | architecture-manager |

## Outputs

Each architecture generates `ARCHITECTURE.md` plus layout-specific files. Enterprise styles also emit `.architecture/dependency-rules.json` and `.architecture/MODULE_BOUNDARIES.md`.

Templates: `apps/cli/templates/architecture-engine/` (enterprise) and `apps/cli/templates/architecture/` (legacy).

## Tests

```bash
pnpm --filter @mycli-cli/architecture-manager test
pnpm --filter @mycli-cli/architecture-engine test
```

See [ARCHITECTURE.md](../../ARCHITECTURE.md).
