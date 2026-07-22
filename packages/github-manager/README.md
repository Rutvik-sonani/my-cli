# @mycli/github-manager

Generates GitHub community files, workflows, Dependabot, Renovate, and label automation.

## CLI commands

| Command | Description |
|---------|-------------|
| `my add github` | CI workflow, issue templates, SECURITY, Dependabot |
| `my add github --release` | Add release workflow |
| `my add github --deploy` | Add deploy workflow |
| `my add github --renovate` | Add `renovate.json` |
| `my git publish --provider github --labels` | Create default GitHub labels via `gh` |

## Outputs

| Path | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | GitHub Actions CI |
| `.github/workflows/release.yml` | Release automation (optional) |
| `.github/workflows/deploy.yml` | Deploy workflow (optional) |
| `.github/ISSUE_TEMPLATE/*.yml` | Bug and feature issue forms |
| `.github/pull_request_template.md` | PR template |
| `.github/dependabot.yml` | Dependency updates |
| `SECURITY.md`, `GITHUB.md`, `.github/CODEOWNERS` | Community files |
| `renovate.json` | Renovate config (optional) |

Templates: `apps/cli/templates/features/github/`.

## Tests

```bash
pnpm --filter @mycli/github-manager test
```

See [GIT_CICD_GUIDE.md](../../GIT_CICD_GUIDE.md).
