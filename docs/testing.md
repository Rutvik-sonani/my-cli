# Testing

How MyCLI itself is tested, and how generated apps are verified.

## Unit and integration (Vitest)

Packages and the CLI use **Vitest** (`vitest run`). Prefer package-local `tests/**/*.test.ts`.

```bash
pnpm test                 # workspace tests (as configured)
pnpm --filter @mycli-cli/cli test
```

## Generated-app E2E (Node script)

End-to-end coverage for apps created by the CLI lives in:

- `scripts/e2e-generated-app.mjs`
- CI: `.github/workflows/e2e-generated.yml` (nightly + manual)

```bash
pnpm e2e:generated
# optional:
MYCLI_E2E_MINIMAL=1 pnpm e2e:generated   # no-database smoke
MYCLI_E2E_LIVE=0 pnpm e2e:generated      # skip live /health server
```

Flow: create project → install → build → run unit/integration tests → optional live `/health` check.

## Playwright policy

**Playwright is not a hard dependency of the MyCLI monorepo.** Browser E2E is opt-in for generated frontends:

| Layer | Tooling |
|-------|---------|
| MyCLI packages / CLI | Vitest |
| Generated API apps | Vitest + Supertest (via `my add testing`) |
| Generated frontends | Add Playwright (or Cypress) in the app when needed |

When scaffolding UI tests:

```bash
my add testing --unit vitest --e2e none   # default in many flows
# In a frontend app, install Playwright yourself, e.g.:
# pnpm create playwright
```

Use Playwright for browser journeys (login UI, checkout). Prefer the generated-app script above for CLI create/add/build regression.
