# @mycli/documentation-engine

Enterprise documentation generation for MyCLI (Phase 19).

## CLI

```bash
my docs setup
my docs list
my docs generate
my docs generate --only architecture,security
my docs generate --force
```

## Generated documents

- `ARCHITECTURE.md`
- `SECURITY.md`
- `COMPLIANCE.md`
- `OPERATIONS.md`
- `SCALING.md`
- `DISASTER_RECOVERY.md`
- `API_GUIDE.md` — conventions and examples (pairs with OpenAPI-oriented `API.md` from `my add swagger`)

## Safety

Never overwrites existing docs unless `--force` is set.
