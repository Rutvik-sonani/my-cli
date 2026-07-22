# @mycli-cli/observability-engine

Enterprise observability platform for MyCLI (Phase 11).

## CLI

```bash
my add observability
my add observability --logger pino
my add observability --logger winston
```

## Modules

| Area | Support |
|------|---------|
| Logging | Pino, Winston — JSON, correlation ID, trace ID |
| Metrics | Prometheus — app / business / custom metrics |
| Tracing | OpenTelemetry — distributed spans |
| Errors | Sentry — error + performance hooks |
| Alerts | In-process alert manager |

## Generated layout

```
src/observability/
  logging/
  metrics/
  tracing/
  alerts/
  errors/
tests/observability/
OBSERVABILITY.md
```
