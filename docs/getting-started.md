# Getting started

## Prerequisites

- Node.js **22+**
- pnpm **9+** (recommended)

## Install MyCLI

From the monorepo (development):

```bash
pnpm install
pnpm build
node apps/cli/dist/index.js --help
```

## Create a project

```bash
my create my-app
# or non-interactive defaults:
my create my-app --yes --skip-install
```

The wizard configures application type, database, ORM, Docker, Git, CI/CD, and more.

## Common workflows

```bash
cd my-app
my make module user --fields name:string,email:email
my add auth
my add docker
my dev
my test
my deploy setup --provider railway
```

## Locales

```bash
MYCLI_LOCALE=hi my create
```

Supported locales: `en`, `hi`, `es`, `fr` (see `locales/`).

## Next steps

- [Plugins](./plugins.md) — extend MyCLI with official or community plugins
- [Templates](./templates.md) — understand the template engine
- [Examples](../examples/minimal-api/) — minimal API starter reference
