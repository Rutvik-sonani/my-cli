# Cloud Deployment Guide (Phase 6)

Phase 6 adds **runtime cloud operations** on top of Phase 4 static scaffolding.

## Quick start

```bash
my deploy setup --provider railway     # Config + DEPLOY.md + secrets doc
my deploy push --provider railway      # Deploy to cloud (uses provider CLI)
my deploy status --provider railway    # Check deployment status
my deploy logs --provider fly          # Tail recent logs
my deploy secrets sync --provider fly --dry-run
my deploy rollback --provider fly --dry-run
my deploy destroy --provider aws --dry-run
my doctor                              # Validates deploy config
```

## Setup vs Push

| Command | What it does |
|---------|--------------|
| `my deploy setup` | Generates provider config + `DEPLOY.md`, `.env.production.example`, secrets doc |
| `my deploy terraform` | Generates Terraform + cloud docs |
| `my deploy push` | Executes provider CLI to deploy (supports `--dry-run`) |
| `my deploy secrets sync` | Maps `.env` keys to provider secret commands |

Phase 4 generates static files. Phase 6 executes deployment operations.

## Supported providers

| Provider | Setup output | Push command |
|----------|--------------|--------------|
| `railway` | `railway.json` | `railway up --detach` |
| `fly` | `fly.toml` | `fly deploy --app <name>` |
| `render` | `render.yaml` | `render deploys create` |
| `vercel` | `vercel.json` | `vercel deploy --prod` |
| `netlify` | `netlify.toml` | `netlify deploy --prod` |
| `aws` | Terraform ECS | `terraform apply` |
| `gcp` | Terraform Cloud Run | `terraform apply` |
| `azure` | Terraform Container Apps | `terraform apply` |
| `digitalocean` | `deploy/digitalocean/app.yaml` | `doctl apps create` |

## Secrets sync

```bash
# Preview which secrets would be synced
my deploy secrets sync --provider railway --dry-run

# Sync from custom env file
my deploy secrets sync --provider fly --env-file .env.staging
```

Skips `NODE_ENV` and `PORT` by default. Generates provider-specific CLI commands.

## Git remote repository (Phase 10)

`git-manager` executes provider CLIs when available (`gh repo create`, `glab repo create`, `az repos create`) or prints manual steps for Bitbucket. Use `my git publish --provider github --dry-run` or `my create my-app --yes --publish github` after scaffolding.

See [GIT_CICD_GUIDE.md](./GIT_CICD_GUIDE.md) for full `my git` command reference.

## Official plugins

- `@mycli-cli/railway` — Railway setup via plugin install
- `@mycli-cli/fly` — Fly.io setup via plugin install
- `@mycli-cli/aws` — AWS Terraform setup

## Managers

| Package | Responsibility |
|---------|----------------|
| `@mycli-cli/cloud-manager` | Runtime deploy, status, logs, rollback, destroy |
| `@mycli-cli/secrets-manager` | Env parsing and secrets sync planning |
| `@mycli-cli/deployment-manager` | Static config generation (Phase 4) + validateSetup |
