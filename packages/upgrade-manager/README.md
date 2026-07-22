# @mycli/upgrade-manager

Migration engine for upgrading generated MyCLI projects without overwriting user code.

## CLI commands

| Command | Description |
|---------|-------------|
| `my upgrade` | Apply pending template migrations |
| `my upgrade --dry-run` | Preview planned file changes |
| `my upgrade --force` | Overwrite existing scaffold files |

## Behavior

- Tracks applied migrations in `.mycli/upgrade-state.json`
- Compares project config version to CLI version
- Applies incremental migrations (paths, docs, quality scaffolds)

## Tests

```bash
pnpm --filter @mycli/upgrade-manager test
```

Used by `apps/cli/src/commands/upgrade.ts`.
