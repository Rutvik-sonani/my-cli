# @mycli-cli/cicd-manager

Generates CI/CD pipeline configuration for GitHub Actions, GitLab CI, Azure Pipelines, Bitbucket Pipelines, and Jenkins.

## CLI commands

| Command | Description |
|---------|-------------|
| `my add cicd` | Interactive provider selection |
| `my add cicd --provider github` | GitHub Actions workflow |
| `my add cicd --provider gitlab` | `.gitlab-ci.yml` |
| `my add cicd --provider azure` | `azure-pipelines.yml` |
| `my add cicd --provider bitbucket` | `bitbucket-pipelines.yml` |
| `my add cicd --provider jenkins` | `Jenkinsfile` |

Also available during `my create` when CI/CD is enabled (non-GitHub providers use this manager).

## Outputs

| Provider | Files |
|----------|-------|
| GitHub | `.github/workflows/ci.yml`, `CICD.md` |
| GitLab | `.gitlab-ci.yml`, `CICD.md` |
| Azure | `azure-pipelines.yml`, `CICD.md` |
| Bitbucket | `bitbucket-pipelines.yml`, `CICD.md` |
| Jenkins | `Jenkinsfile`, `CICD.md` |

Templates: `apps/cli/templates/features/cicd/`.

## Tests

```bash
pnpm --filter @mycli-cli/cicd-manager test
```

See [GIT_CICD_GUIDE.md](../../GIT_CICD_GUIDE.md).
