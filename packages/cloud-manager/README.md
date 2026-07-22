# @mycli/cloud-manager

Runtime cloud deployment operations via provider CLI adapters (Railway, Fly.io, AWS, GCP, Azure).

## CLI commands

| Command | Description |
|---------|-------------|
| `my deploy setup` | Generate `DEPLOY.md` and provider docs |
| `my deploy push --provider railway` | Deploy to provider |
| `my deploy status --provider <name>` | Check deployment status |
| `my deploy logs --provider <name>` | Stream deployment logs |
| `my deploy rollback --provider <name>` | Roll back last deployment |
| `my deploy destroy --provider <name>` | Tear down deployment |

## Outputs

| Path | Purpose |
|------|---------|
| `DEPLOY.md` | Deployment runbook |
| `.env.production.example` | Production env template |
| `deploy/secrets.<provider>.md` | Secrets sync notes per provider |

Templates: `apps/cli/templates/features/cloud/`.

## Tests

```bash
pnpm --filter @mycli/cloud-manager test
```

See [CLOUD_DEPLOY_GUIDE.md](../../CLOUD_DEPLOY_GUIDE.md).
