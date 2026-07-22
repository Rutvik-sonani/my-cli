# Plugin Marketplace Guide (Phase 7)

MyCLI includes a plugin marketplace for discovering, installing, and publishing extensions.

## Quick start

```bash
my plugin search docker          # Search local registry
my plugin search mycli --registry npm   # Search npm registry
my plugin install @mycli-cli/docker  # Install from marketplace
my plugin install @mycli-cli/docker --from npm --dry-run  # Plan npm install
my plugin create @mycli-cli/plugin-billing  # Scaffold with Plugin SDK
my plugin list                     # List loaded plugins
my plugin update @mycli-cli/docker     # Reinstall latest
my plugin remove @mycli-cli/docker     # Uninstall
my plugin publish ./my-plugin    # Publish to community registry
my plugin publish ./my-plugin --npm  # Include npm publish plan
```

## Registry

The local catalog lives at **`plugins/plugins.json`** at the monorepo root (or bundled with the CLI in `apps/cli/dist/`).

```
plugins/
  plugins.json       ← RegistryManager catalogPath (default: join(repoRoot, 'plugins', 'plugins.json'))
  official/<slug>/   ← source for @mycli-cli/* plugins
  community/<slug>/  ← my plugin publish destination
```

Each entry includes:

| Field | Purpose |
|-------|---------|
| `name` | Plugin identifier (`@mycli-cli/docker`) |
| `slug` | Directory name (`docker`) |
| `npmPackage` | npm package name (`@mycli-cli/plugin-docker`) |
| `version` | Semver |
| `compatibility` | Minimum CLI version |
| `downloads` | Popularity ranking |

## Install flow

1. `registry-manager` resolves plugin from local catalog or npm
2. Validates CLI compatibility
3. Copies plugin to `plugins/installed/<slug>/` (local) or runs `npm install` (npm)
4. `plugin-system` loads and runs `install()` hook
5. Saves plugin entry (with path) to `.myclirc.json`
6. Increments download count in local catalog when applicable

## npm marketplace (Phase 14)

- `my plugin search <query> --registry npm|all` queries registry.npmjs.org for `@mycli-cli/*` packages
- `my plugin install <name> --from npm` installs via npm into `plugins/installed/<slug>/`
- `my plugin publish <dir> --npm` prints npm publish commands alongside catalog update

## Official plugins

All plugins in `plugins/official/` include `plugin.json` manifests:

`auth`, `rbac`, `docker`, `prisma`, `postgres`, `mysql`, `mongodb`, `mariadb`, `sqlite`, `redis`, `sqlserver`, `cockroachdb`, `swagger`, `kubernetes`, `aws`, `github`, `railway`, `fly`, `ai`

## Publish flow

```bash
my plugin publish ./packages/my-plugin --dry-run
my plugin publish ./packages/my-plugin
```

1. Validates `plugin.json` in the plugin directory
2. Copies to `plugins/community/<slug>/`
3. Updates `plugins/plugins.json` catalog

## Managers

| Package | Responsibility |
|---------|----------------|
| `@mycli-cli/registry-manager` | Catalog load, search, get, publish, path resolution |
| `@mycli-cli/marketplace-manager` | Install, update, uninstall, publish orchestration |
| `@mycli-cli/plugin-system` | Plugin lifecycle, load, hooks, commands |

## Authoring plugins

See [PLUGIN_GUIDE.md](./PLUGIN_GUIDE.md) for plugin structure and `definePlugin()` API.
