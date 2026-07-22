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
  "name": "@mycli/plugin-stripe",
  "version": "1.0.0",
  "description": "Stripe payments",
  "main": "dist/index.js",
  "compatibility": ">=1.0.0"
}
```

## Implementing a plugin

```ts
import { definePlugin } from '@mycli/plugin-system';

export default definePlugin({
  name: '@mycli/plugin-stripe',
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
my plugin install @mycli/plugin-stripe
my plugin list
my plugin update @mycli/docker
my plugin remove @mycli/plugin-stripe
my plugin publish ./my-plugin --dry-run
my plugin create @mycli/plugin-billing
my plugin search mycli --registry npm
my plugin install @mycli/docker --from npm
my add ai
my ai generate module user --dry-run
```

## Plugin catalog (`plugins/plugins.json`)

The **local marketplace catalog** is a JSON file at the repository root:

```
mycli/
  plugins/
    plugins.json          ← catalog (name, slug, version, compatibility, downloads)
    official/             ← first-party plugins (@mycli/*)
    community/            ← published community plugins
    installed/            ← per-project installs (generated projects)
```

| Context | Resolved path |
|---------|---------------|
| Monorepo development | `<repoRoot>/plugins/plugins.json` |
| CLI runtime (bundled) | Resolved via `apps/cli` paths helper alongside copied templates |

`@mycli/registry-manager` loads and searches this catalog. `@mycli/marketplace-manager` orchestrates install/publish and updates the catalog on `my plugin publish`.

See [MARKETPLACE_GUIDE.md](./MARKETPLACE_GUIDE.md) for the full Phase 7 marketplace reference.

## Official categories

`@mycli/auth`, `@mycli/rbac`, `@mycli/docker`, `@mycli/prisma`, `@mycli/postgres`, `@mycli/mysql`, `@mycli/mongodb`, `@mycli/mariadb`, `@mycli/sqlite`, `@mycli/redis`, `@mycli/sqlserver`, `@mycli/cockroachdb`, `@mycli/swagger`, `@mycli/kubernetes`, `@mycli/aws`, `@mycli/azure`, `@mycli/gcp`, `@mycli/github`, `@mycli/railway`, `@mycli/fly`, `@mycli/ai`

Community example: `@community/hello-mycli` in `plugins/community/hello-mycli/`.
