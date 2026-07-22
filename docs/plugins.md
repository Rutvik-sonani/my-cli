# Plugins

MyCLI supports **21 official plugins** and **community plugins** via the marketplace.

## Official plugins

| Category | Plugins |
|----------|---------|
| Auth & API | `@mycli/auth`, `@mycli/rbac`, `@mycli/swagger` |
| Database | `@mycli/postgres`, `@mycli/mysql`, `@mycli/mongodb`, `@mycli/mariadb`, `@mycli/sqlite`, `@mycli/redis`, `@mycli/sqlserver`, `@mycli/cockroachdb`, `@mycli/prisma` |
| Infra | `@mycli/docker`, `@mycli/kubernetes`, `@mycli/aws`, `@mycli/azure`, `@mycli/gcp` |
| Cloud PaaS | `@mycli/railway`, `@mycli/fly`, `@mycli/github` |
| AI | `@mycli/ai` |

## CLI commands

```bash
my plugin search docker
my plugin install @mycli/docker
my plugin list
my plugin create @mycli/plugin-billing
my plugin publish ./plugins/community/my-plugin
```

## Community example

See [`plugins/community/hello-mycli`](../plugins/community/hello-mycli/) for a minimal community plugin built with `@mycli/plugin-sdk`.

## Authoring

1. `my plugin create @mycli/plugin-<name>`
2. Implement `install()`, optional `commands()`, `hooks()`, `dependencies()`
3. Test locally with `my plugin install ./plugins/community/<name> --path`
4. Publish with `my plugin publish`

Full reference: [PLUGIN_GUIDE.md](../PLUGIN_GUIDE.md) and [MARKETPLACE_GUIDE.md](../MARKETPLACE_GUIDE.md).

## Testing

Official plugin install smoke tests run in `plugins/official-tests/`.
