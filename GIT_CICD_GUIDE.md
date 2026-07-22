# Git & CI/CD Guide (Phase 5 + Phase 10)

MyCLI generates GitHub community files, multi-provider CI/CD pipelines, release automation, and **real Git provider automation** via `gh` and `glab`.

## Quick start

```bash
my add github                    # GitHub workflows + community files + issue templates
my add github --release          # Include Changesets release workflow
my git providers                 # List git providers and CLI availability
my git remote create --provider github --name my-app --dry-run
my git publish --provider github --name my-app --dry-run
my create my-app --yes --publish github --dry-run   # Preview remote publish during create
my add cicd --provider gitlab    # GitLab CI pipeline
my add cicd --provider azure     # Azure Pipelines
my add cicd --provider bitbucket  # Bitbucket Pipelines
my add cicd --provider jenkins   # Jenkinsfile
my add release                   # Changesets + semantic-release config
my doctor                        # Validates enabled git/cicd features
```

## GitHub (`my add github`)

Generates:

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | CI pipeline (lint, test, build) |
| `.github/workflows/release.yml` | Changesets release (with `--release`) |
| `.github/dependabot.yml` | Weekly dependency updates |
| `.github/pull_request_template.md` | PR template |
| `.github/ISSUE_TEMPLATE/bug.yml` | Bug report form |
| `.github/ISSUE_TEMPLATE/feature.yml` | Feature request form |
| `.github/CODEOWNERS` | Default reviewers |
| `.github/LABELS.md` | Suggested label list |
| `SECURITY.md` | Security policy |
| `GITHUB.md` | Setup documentation |

Auto-detects your package manager (pnpm/npm/yarn/bun) for CI commands.

Options: `--node-version`, `--release`, `--deploy`, `--renovate`

`--deploy` also enables Renovate for parity with `my create`.

## Git provider automation (`my git`) — Phase 10

| Command | Description |
|---------|-------------|
| `my git providers` | Show GitHub/GitLab/Bitbucket/Azure DevOps support and CLI status |
| `my git remote create` | Create remote repository via provider CLI |
| `my git publish` | Init → commit → create remote → push |
| `my git push` | Push current branch to remote |

Providers:

| Provider | CLI | Automation |
|----------|-----|------------|
| `github` | `gh` | `gh repo create … --source=. --remote=origin --push` |
| `gitlab` | `glab` | `glab repo create … --remote` + push |
| `bitbucket` | `bb` or REST | `BITBUCKET_TOKEN` + `--owner` workspace; creates repo via API |
| `azure-devops` | `az` | `az repos create --project` (requires `--org` and `--project`) |

Use `--dry-run` to preview commands without network access. During `my create`, pass `--publish github` to publish after scaffolding (requires authenticated CLI).

Options: `--provider`, `--name`, `--owner`, `--org`, `--project`, `--private`, `--branch`, `--labels`, `--dry-run`

Pass `--labels` on publish (GitHub only) to create bug/feature/documentation/security labels via `gh label create`.

## CI/CD (`my add cicd`)

| Provider | Output |
|----------|--------|
| `github` | `.github/workflows/ci.yml` |
| `gitlab` | `.gitlab-ci.yml` |
| `azure` | `azure-pipelines.yml` |
| `bitbucket` | `bitbucket-pipelines.yml` |
| `jenkins` | `Jenkinsfile` |

Also generates `CICD.md` with provider-specific documentation.

Options: `--provider`, `--node-version`

## Release (`my add release`)

Generates:

| File | Purpose |
|------|---------|
| `.changeset/config.json` | Changesets configuration |
| `CHANGELOG.md` | Changelog scaffold |
| `release.config.js` | Semantic Release config (semver) |
| `release.calver.config.js` | Calendar versioning config (with `--strategy calver`) |
| `RELEASE.md` | Release workflow docs |

Options: `--strategy semver|calver`

## Commitizen (`pnpm commit`)

When git hooks are enabled during `my create`, projects include:

| File / script | Purpose |
|---------------|---------|
| `.cz-config.js` | Commitizen adapter config |
| `pnpm commit` | Interactive conventional commit prompt |
| Husky `pre-commit` | Runs `lint-staged` with Biome |

Commit conventions: `conventional`, `angular`, or `custom` (via `--commit-convention`).

## Quality (`my add quality`)

| File | Purpose |
|------|---------|
| `biome.json` | Default lint + format (Biome) |
| `eslint.config.js` | ESLint flat config (with `--eslint`) |
| `prettier.config.js` | Prettier config (with `--prettier`) |

Generated projects include `biome.json` by default. Use `my add quality --eslint --prettier` to switch toolchains.

## JavaScript projects

```bash
my create js-app --yes --language javascript --skip-install --skip-git
```

JavaScript projects skip `tsconfig.json`, use `src/index.js`, and generate `.js` test configs.

## Official plugin

- `@mycli-cli/github` — GitHub scaffolding via `my plugin install @mycli-cli/github`

## Managers

| Package | Responsibility |
|---------|----------------|
| `@mycli-cli/github-manager` | GitHub community files and workflows |
| `@mycli-cli/cicd-manager` | Multi-provider CI/CD pipelines |
| `@mycli-cli/release-manager` | Changesets and semantic-release setup |
| `@mycli-cli/git-manager` | Local git lifecycle, provider adapters (`gh`/`glab`/`az`) |

Templates live in `apps/cli/templates/features/{github,cicd,release}/`.
