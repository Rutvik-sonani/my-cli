# @mycli/registry-manager

Local plugin catalog (`plugins/plugins.json`) with search, resolve, publish, and npm registry integration.

## CLI commands

| Command | Description |
|---------|-------------|
| `my plugin search docker` | Search local catalog |
| `my plugin search mycli --registry npm` | Search npm for `@mycli/*` packages |
| `my plugin publish ./plugin --dry-run` | Validate and plan catalog update |

## Catalog location

| Context | Path |
|---------|------|
| Monorepo development | `plugins/plugins.json` (repo root) |
| Bundled CLI | Copied alongside templates in `apps/cli/dist/` |

Each catalog entry includes `name`, `slug`, `npmPackage`, `version`, `compatibility`, and `downloads`.

## API

```ts
import { createRegistryManager } from '@mycli/registry-manager';

const registry = createRegistryManager({ repoRoot: process.cwd() });
const results = await registry.search({ query: 'docker' });
```

## Tests

```bash
pnpm --filter @mycli/registry-manager test
```

See [MARKETPLACE_GUIDE.md](../../MARKETPLACE_GUIDE.md) and [PLUGIN_GUIDE.md](../../PLUGIN_GUIDE.md).
