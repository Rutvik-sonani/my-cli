# @mycli/architecture-engine

Enterprise **architecture style engine** for MyCLI (Phase 1). Selects a structural pattern and scaffolds folder layout, dependency rules, and documentation.

## Architecture styles

| Style | CLI value | Module root |
|-------|-----------|-------------|
| MVC | `mvc` | `src/modules` |
| Modular Monolith | `modular-monolith` | `src/modules` |
| Clean Architecture | `clean-architecture` | `src/application` |
| Hexagonal | `hexagonal` | `src/core` |
| Domain Driven Design | `domain-driven-design` | `src/domain` |
| Microservice | `microservice` | `services` |

Legacy layouts (`monolith`, `monorepo`, `polyrepo`) delegate to `@mycli/architecture-manager`.

## Provider interface

Each style implements `ArchitectureStyleProvider`:

- `getModulePaths()` — generator paths (e.g. `my make module`)
- `getDependencyRules()` — import boundaries
- `getTemplateFiles()` — EJS templates under `apps/cli/templates/architecture-engine/`

## CLI usage

```bash
my architecture list
my architecture validate
my architecture setup-lint

my create api --yes --architecture-style clean-architecture
```

## Generated artifacts

- `ARCHITECTURE.md` — style-specific guide
- `.architecture/dependency-rules.json` — machine-readable import rules
- `.architecture/MODULE_BOUNDARIES.md` — human-readable boundaries
- Layer folders per style (domain, application, adapters, etc.)

## Tests

```bash
pnpm --filter @mycli/architecture-engine test
```

## Related

- `@mycli/architecture-manager` — legacy monolith/monorepo/polyrepo layouts
- Phase 2: `my make domain` (DDD generator) — not yet implemented
