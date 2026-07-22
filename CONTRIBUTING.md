# Contributing

Thank you for contributing to MyCLI. Please read this guide before opening a pull request.

## Community standards

- [Code of Conduct](./CODE_OF_CONDUCT.md) — expected behavior in issues, PRs, and discussions
- [Security Policy](./SECURITY.md) — how to report vulnerabilities privately

## Setup

```bash
pnpm install
pnpm build
pnpm test
```

## Workflow

1. Create a feature branch from `main`
2. Make focused changes in the relevant package under `packages/` or `apps/cli/`
3. Add or adjust Vitest coverage for changed behavior
4. Run `pnpm lint`, `pnpm build`, and `pnpm test`
5. Open a PR using the [pull request template](./.github/pull_request_template.md)

## Commit convention

Prefer [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(generator-engine): add migration generator
fix(cli): handle non-interactive create --yes
docs(platform-manager): document tenancy modes
```

Husky enforces Conventional Commits on `commit-msg` when hooks are installed.

## Packages

Keep packages independent. Public APIs belong in each package's `src/index.ts`. Avoid circular dependencies.

Every package under `packages/` should have a `README.md` describing CLI commands, outputs, and how to run tests.

## Templates

Never generate files with string concatenation in generators. Add an `.ejs` template under `apps/cli/templates/` (or a plugin template directory) and render via `@mycli/template-engine`.

## Plugins

See [PLUGIN_GUIDE.md](./PLUGIN_GUIDE.md) and [MARKETPLACE_GUIDE.md](./MARKETPLACE_GUIDE.md) for plugin authoring and the local catalog at `plugins/plugins.json`.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for monorepo layout (`apps/cli` vs `packages/*`).
