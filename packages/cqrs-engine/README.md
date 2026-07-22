# @mycli/cqrs-engine

CQRS scaffolding and runtime buses for MyCLI (Phase 3).

## CLI

```bash
my add cqrs
my make command create-order
my make query get-order
```

## Runtime

- `CommandBus` — command dispatch with middleware pipeline
- `QueryBus` — read-side queries with middleware
- `EventBus` — integration event fan-out
- `createLoggingMiddleware` / `createValidationMiddleware`

## Generated layout

```
src/cqrs/
  command-bus.ts
  query-bus.ts
  event-bus.ts
  middleware/
  register-handlers.ts
src/application/
  commands/
  queries/
  events/
tests/cqrs/
CQRS.md
```
