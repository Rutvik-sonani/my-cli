# @mycli/secrets-manager

Plans and syncs environment secrets from `.env` files to cloud provider secret stores.

## CLI commands

| Command | Description |
|---------|-------------|
| `my deploy secrets sync` | Sync secrets to configured provider |
| `my deploy secrets sync --provider railway --dry-run` | Preview sync commands |
| `my deploy secrets sync --env-file .env.production` | Use alternate env file |

Supported providers: Railway, Fly.io, AWS, GCP, Azure (via provider CLI adapters).

## Outputs

| Path | Purpose |
|------|---------|
| `deploy/secrets.<provider>.md` | Provider-specific sync documentation |
| `SECRETS.md` | General secrets management guide |

Templates: `apps/cli/templates/features/secrets/`.

## Tests

```bash
pnpm --filter @mycli/secrets-manager test
```

See [CLOUD_DEPLOY_GUIDE.md](../../CLOUD_DEPLOY_GUIDE.md).
