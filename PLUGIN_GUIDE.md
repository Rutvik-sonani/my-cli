# Plugin Guide

## Plugin layout

```
plugin-stripe/
  plugin.json
  src/index.ts
  commands/
  templates/
  hooks/
  README.md
```

## plugin.json

```json
{
  "name": "@mycli-cli/plugin-stripe",
  "version": "1.0.0",
  "description": "Stripe payments",
  "main": "dist/index.js",
  "compatibility": ">=1.0.0"
}
```

## Implementing a plugin

```ts
import { definePlugin } from '@mycli-cli/plugin-system';

export default definePlugin({
  name: '@mycli-cli/plugin-stripe',
  version: '1.0.0',
  async install(ctx) {
    // generate files, update config
  },
  commands() {
    return [
      {
        name: 'stripe',
        description: 'Stripe helpers',
        handler: async () => {},
      },
    ];
  },
  templates() {
    return ['templates/stripe'];
  },
  dependencies() {
    return { stripe: '^17.0.0' };
  },
});
```

## CLI

```bash
my plugin search stripe
my plugin install @mycli-cli/plugin-stripe
my plugin list
my plugin update @mycli-cli/docker
my plugin remove @mycli-cli/plugin-stripe
my plugin publish ./my-plugin --dry-run
my plugin create @mycli-cli/plugin-billing
my plugin search mycli --registry npm
my plugin install @mycli-cli/docker --from npm
my add ai
my ai generate module user --dry-run
```

## Plugin catalog (`plugins/plugins.json`)

The **local marketplace catalog** is a JSON file at the repository root:

```
mycli/
  plugins/
    plugins.json          ← catalog (name, slug, version, compatibility, downloads)
    official/             ← first-party plugins (@mycli-cli/*)
    community/            ← published community plugins
    installed/            ← per-project installs (generated projects)
```

| Context | Resolved path |
|---------|---------------|
| Monorepo development | `<repoRoot>/plugins/plugins.json` |
| CLI runtime (bundled) | Resolved via `apps/cli` paths helper alongside copied templates |

`@mycli-cli/registry-manager` loads and searches this catalog. `@mycli-cli/marketplace-manager` orchestrates install/publish and updates the catalog on `my plugin publish`.

See [MARKETPLACE_GUIDE.md](./MARKETPLACE_GUIDE.md) for the full Phase 7 marketplace reference.

## Official categories

`@mycli-cli/auth`, `@mycli-cli/rbac`, `@mycli-cli/docker`, `@mycli-cli/prisma`, `@mycli-cli/postgres`, `@mycli-cli/mysql`, `@mycli-cli/mongodb`, `@mycli-cli/mariadb`, `@mycli-cli/sqlite`, `@mycli-cli/redis`, `@mycli-cli/sqlserver`, `@mycli-cli/cockroachdb`, `@mycli-cli/swagger`, `@mycli-cli/kubernetes`, `@mycli-cli/aws`, `@mycli-cli/azure`, `@mycli-cli/gcp`, `@mycli-cli/github`, `@mycli-cli/railway`, `@mycli-cli/fly`, `@mycli-cli/ai`

Community example: `@community/hello-mycli` in `plugins/community/hello-mycli/`.
