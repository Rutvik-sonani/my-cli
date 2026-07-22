# @mycli-cli/enterprise-core

Shared TypeScript contracts for the MyCLI enterprise platform extension.

## Exports

- **Architecture** — `ArchitectureStyle`, `DependencyRule`, `ArchitectureModulePaths`
- **Domain** — `DomainEntityPaths`, `DomainLayerPaths`

## Consumers

- `@mycli-cli/architecture-engine` — Phase 1 architecture styles
- `@mycli-cli/domain-engine` — Phase 2 DDD generators

## Tests

```bash
pnpm --filter @mycli-cli/enterprise-core test
```
