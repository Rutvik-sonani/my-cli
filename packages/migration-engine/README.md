# @mycli-cli/migration-engine

Enterprise migration and upgrade engine for MyCLI (Phase 17).

## CLI

```bash
my upgrade setup
my upgrade
my upgrade --scope project,template
my upgrade --dry-run
my upgrade --force
```

## Scopes

- **project** — generated project scaffold migrations (safe, no overwrite)
- **cli** — CLI compatibility / version guidance
- **plugin** — installed plugin compatibility checks
- **template** — installed marketplace template upgrades

## Safety rules

1. Never overwrite user changes automatically
2. Backup key files before applying upgrades
3. Write `UPGRADE_REPORT.md` after every run
4. Record migration files under `.mycli/migrations/`

## Layout

```
src/migration/
  migrations/
  backup/
  reports/
.mycli/upgrade-backups/
.mycli/migrations/
UPGRADE_REPORT.md
MIGRATION.md
```
