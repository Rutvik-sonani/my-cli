# @mycli-cli/audit-engine

Enterprise audit platform for MyCLI (Phase 7).

## CLI

```bash
my add audit
my add audit --storage file
```

## Features

- **AuditService** — record actions with before/after state
- **AuditRepository** — query helper over storage
- **AuditMiddleware** — capture IP, device, actor on requests
- **AuditStorage** — memory or JSONL file backend

## Generated layout

```
src/audit/
  audit-record.ts
  audit.service.ts
  audit.repository.ts
  audit.middleware.ts
  storage/
tests/audit/
AUDIT.md
```

## Record fields

User, Action, Resource, Timestamp, IP, Device, Before State, After State
