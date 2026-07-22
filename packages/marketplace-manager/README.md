# @mycli/marketplace-manager

Orchestrates plugin install, update, uninstall, and publish via the registry and plugin system.

## CLI commands

| Command | Description |
|---------|-------------|
| `my plugin install @mycli/docker` | Install from local catalog or npm |
| `my plugin install @mycli/docker --from npm` | Force npm install |
| `my plugin update @mycli/docker` | Reinstall latest version |
| `my plugin remove @mycli/docker` | Uninstall plugin |
| `my plugin publish ./my-plugin` | Publish to community registry |

## Behavior

1. Resolves plugin entry via `@mycli/registry-manager`
2. Validates CLI compatibility semver
3. Copies to `plugins/installed/<slug>/` or runs `npm install`
4. Runs plugin `install()` hook through `@mycli/plugin-system`
5. Persists plugin metadata in `.myclirc.json`

## Tests

```bash
pnpm --filter @mycli/marketplace-manager test
```

See [MARKETPLACE_GUIDE.md](../../MARKETPLACE_GUIDE.md).
