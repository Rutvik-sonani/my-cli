# Publishing @mycli-cli/cli

MyCLI uses [Changesets](https://github.com/changesets/changesets) for version management and npm publishing.

## Prerequisites

- npm account with publish access to the **`@mycli-cli`** scope (org name must be `mycli-cli`)
- `NPM_TOKEN` set in CI (GitHub Actions secret) for automated releases
- All packages built: `pnpm build`

## Local release (maintainers)

1. **Add a changeset** when shipping user-facing changes:

   ```bash
   pnpm changeset
   ```

   Select affected packages (typically `@mycli-cli/cli` and any updated managers), choose semver bump, and write a summary.

2. **Version packages** (updates `package.json` versions and changelog):

   ```bash
   pnpm version-packages
   ```

3. **Publish to npm**:

   ```bash
   pnpm release
   ```

   This runs `pnpm build` then `changeset publish`.

## CI release

The repository includes [`.github/workflows/release.yml`](./.github/workflows/release.yml). On every push to `main` it:

1. Runs `pnpm install --frozen-lockfile`
2. Runs `pnpm build`
3. Uses [changesets/action](https://github.com/changesets/action) with `NPM_TOKEN`

The action opens a “Version packages” PR when changesets exist; merging that PR triggers `pnpm release` (`pnpm build && changeset publish`).

### Required secrets

| Secret | Purpose |
|--------|---------|
| `NPM_TOKEN` | npm automation token with publish access to `@mycli-cli/*` |
| `GITHUB_TOKEN` | Provided by Actions — used to open version PRs |

The Release workflow also sets `NODE_AUTH_TOKEN` from `NPM_TOKEN` (required by `actions/setup-node` registry auth).

### Fixing `E404` on `PUT https://registry.npmjs.org/@mycli-cli%2f…`

npm returns **404** (not 403) when the token cannot publish to that scope. Check:

1. Org exists as **`mycli-cli`**: https://www.npmjs.com/settings/~/organizations  
2. You are an **Owner** of that org  
3. Token is **Automation** (or Granular with write to `@mycli-cli` packages) from the same account  
4. GitHub secret is named exactly `NPM_TOKEN`  
5. Re-run the **Release** workflow after fixing token/org  

Local check:

```bash
npm whoami
npm org ls mycli-cli
```

## Publishing official plugins

Official plugins live under `plugins/official/*` as `@mycli-cli/plugin-*` packages. They are **not** in the default Changesets linked group (only core CLI packages are linked today).

To publish plugins:

1. Ensure the plugin `package.json` has `"publishConfig": { "access": "public" }` and is not `"private": true`.
2. Add a changeset selecting the plugin package(s) you changed.
3. Run the normal `version-packages` → merge PR → `release` flow.

Plugins are loaded at runtime when users run `my plugin add <name>`; publishing them to npm makes installation work outside the monorepo:

```bash
npm install -g @mycli-cli/plugin-postgres
my plugin add postgres
```

For local development, plugins resolve from the workspace via `pnpm build` without publishing.

## Documentation site

The static docs site is built from repository markdown:

```bash
pnpm --filter @mycli-cli/website build
# output: apps/website/dist
```

GitHub Pages deploy runs via [`.github/workflows/docs.yml`](./.github/workflows/docs.yml) on pushes to `main`. Enable **GitHub Pages → Source: GitHub Actions** in repository settings.

## Verify before publish

```bash
pnpm build
pnpm --filter @mycli-cli/cli test
pnpm e2e:generated
```

## Install for end users

After publish:

```bash
npm install -g @mycli-cli/cli
my create my-app --yes
```

Generated apps are scaffolds — configure env, database, and mail before production deploy. See [ENVIRONMENT.md](./apps/cli/templates/features/env/ENVIRONMENT.md.ejs) in generated projects.
