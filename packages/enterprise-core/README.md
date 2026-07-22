# @mycli/enterprise-core

Shared TypeScript contracts for the MyCLI enterprise platform extension.

## Exports

- **Architecture** — `ArchitectureStyle`, `DependencyRule`, `ArchitectureModulePaths`
- **Domain** — `DomainEntityPaths`, `DomainLayerPaths`

## Consumers

- `@mycli/architecture-engine` — Phase 1 architecture styles
- `@mycli/domain-engine` — Phase 2 DDD generators

## Tests

```bash
pnpm --filter @mycli/enterprise-core test
```
