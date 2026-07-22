# MyCLI Documentation

Welcome to the MyCLI documentation. Guides in this folder complement the root `*_GUIDE.md` files.

## Contents

| Document | Description |
|----------|-------------|
| [Getting started](./getting-started.md) | Install, create a project, daily commands |
| [Plugins](./plugins.md) | Official plugins, authoring, marketplace |
| [Templates](./templates.md) | Where templates live and how they are rendered |
| [Testing](./testing.md) | Vitest, generated-app E2E, Playwright policy |
| [Examples](../examples/) | Starter project references |

## Root guides (reference)

- [ARCHITECTURE.md](../ARCHITECTURE.md) — monorepo layout
- [PLUGIN_GUIDE.md](../PLUGIN_GUIDE.md) — plugin authoring
- [MARKETPLACE_GUIDE.md](../MARKETPLACE_GUIDE.md) — install, publish, registry
- [GENERATOR_GUIDE.md](../GENERATOR_GUIDE.md) — `my make` generators
- [SERVICES_GUIDE.md](../SERVICES_GUIDE.md) — cache, queue, mail, …
- [INFRA_GUIDE.md](../INFRA_GUIDE.md) — Docker, K8s, Terraform
- [CLOUD_DEPLOY_GUIDE.md](../CLOUD_DEPLOY_GUIDE.md) — `my deploy` workflows
- [DATABASE_GUIDE.md](../DATABASE_GUIDE.md) — ORMs and databases
- [GIT_CICD_GUIDE.md](../GIT_CICD_GUIDE.md) — Git and CI/CD in create wizard

## CLI quick reference

```bash
my create <name>          # Interactive project wizard
my make list              # List code generators
my add <feature>          # Add auth, docker, cache, …
my deploy setup           # PaaS / cloud deployment config
my plugin search <term>   # Marketplace search
my doctor                 # Project health checks
```
