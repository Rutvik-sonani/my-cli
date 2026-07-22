# Plugins

MyCLI supports **21 official plugins** and **community plugins** via the marketplace.

## Official plugins

| Category | Plugins |
|----------|---------|
| Auth & API | `@mycli-cli/auth`, `@mycli-cli/rbac`, `@mycli-cli/swagger` |
| Database | `@mycli-cli/postgres`, `@mycli-cli/mysql`, `@mycli-cli/mongodb`, `@mycli-cli/mariadb`, `@mycli-cli/sqlite`, `@mycli-cli/redis`, `@mycli-cli/sqlserver`, `@mycli-cli/cockroachdb`, `@mycli-cli/prisma` |
| Infra | `@mycli-cli/docker`, `@mycli-cli/kubernetes`, `@mycli-cli/aws`, `@mycli-cli/azure`, `@mycli-cli/gcp` |
| Cloud PaaS | `@mycli-cli/railway`, `@mycli-cli/fly`, `@mycli-cli/github` |
| AI | `@mycli-cli/ai` |

## CLI commands

```bash
my plugin search docker
my plugin install @mycli-cli/docker
my plugin list
my plugin create @mycli-cli/plugin-billing
my plugin publish ./plugins/community/my-plugin
```

## Community example

See [`plugins/community/hello-mycli`](../plugins/community/hello-mycli/) for a minimal community plugin built with `@mycli-cli/plugin-sdk`.

## Authoring

1. `my plugin create @mycli-cli/plugin-<name>`
2. Implement `install()`, optional `commands()`, `hooks()`, `dependencies()`
3. Test locally with `my plugin install ./plugins/community/<name> --path`
4. Publish with `my plugin publish`

Full reference: [PLUGIN_GUIDE.md](../PLUGIN_GUIDE.md) and [MARKETPLACE_GUIDE.md](../MARKETPLACE_GUIDE.md).

## Testing

Official plugin install smoke tests run in `plugins/official-tests/`.
