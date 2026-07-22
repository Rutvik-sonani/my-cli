# MyCLI

**Laravel Artisan for Node.js** — a production-grade application development platform.

```bash
npm i -g @mycli/cli
# or
pnpm add -g @mycli/cli

my create
my make module user
my make crud product --fields name:string,price:number
my add auth
my add rbac
my add database
my add swagger
my add testing
my role create admin
my permission create user.read
my add docker
my add kubernetes
my add github
my add cicd --provider gitlab
my add release
my deploy terraform --provider aws
my plugin search docker
my plugin install @mycli/docker
my doctor
my deploy setup
my deploy push --provider railway
my deploy secrets sync --dry-run
```

## Requirements

- Node.js >= 22
- pnpm >= 9 (for developing this monorepo)

## Monorepo

```
apps/cli          → `my` executable (@mycli/cli)
apps/website      → documentation site
packages/*        → engines and managers
templates/        → shared project templates
plugins/          → official & community plugins
```

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm my --help
```

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md), [FEATURES_GUIDE.md](./FEATURES_GUIDE.md), [INFRA_GUIDE.md](./INFRA_GUIDE.md), [GIT_CICD_GUIDE.md](./GIT_CICD_GUIDE.md), [IDE_GUIDE.md](./IDE_GUIDE.md), [SERVICES_GUIDE.md](./SERVICES_GUIDE.md), [PLATFORM_GUIDE.md](./PLATFORM_GUIDE.md), [CLOUD_DEPLOY_GUIDE.md](./CLOUD_DEPLOY_GUIDE.md), [GENERATOR_GUIDE.md](./GENERATOR_GUIDE.md), and [PLUGIN_GUIDE.md](./PLUGIN_GUIDE.md).

## Phases

| Phase | Focus |
|------:|-------|
| 1 | Core foundation (engines, CLI, plugin system) ✅ |
| 2 | Generators (module/CRUD/auto-registration) ✅ |
| 3 | Auth, RBAC, database, ORM, Swagger, testing ✅ |
| 4 | Docker, K8s, Helm, Terraform ✅ |
| 5 | Git providers & CI/CD ✅ |
| 6 | Cloud deployment ✅ |
| 7 | Plugin marketplace ✅ |
| 8 | Frontend, UI library, architecture templates, workflow commands ✅ |
| 9 | Full ORM coverage + per-database plugins ✅ |
| 10 | Git provider automation (`gh`/`glab`), `my git`, issue templates ✅ |
| 11 | DevContainer + IDE config (VS Code/Cursor) + workflow commands ✅ |
| 12 | Cache, queue, events, mail, storage, payment services ✅ |
| 13 | Observability, security, tenancy, feature-flags, search ✅ |
| 14 | AI plugin + Plugin SDK + npm marketplace ✅ |

## License

MIT
