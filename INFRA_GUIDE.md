# Infrastructure Guide (Phase 4)

MyCLI generates production-ready container and cloud infrastructure from EJS templates.

## Quick start

```bash
my add docker                    # Dockerfile + Compose + docs
my add docker --nginx            # Include nginx reverse proxy
my add kubernetes                # K8s manifests in k8s/
my add helm                      # Helm chart in helm/<app>/
my add terraform --provider aws  # Terraform in deploy/terraform/aws/
my deploy setup --provider railway
my deploy terraform --provider gcp --region us-central1
my doctor                        # Validates enabled infra features
```

## Docker (`my add docker`)

Generates:

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage Node.js build |
| `.dockerignore` | Build context exclusions |
| `docker-compose.yml` | Dev stack (app, postgres, redis, mailhog) |
| `docker-compose.prod.yml` | Production compose profile |
| `docker-compose.test.yml` | CI / integration test compose |
| `DOCKER.md` | Usage documentation |
| `docker/nginx/default.conf` | Nginx proxy (with `--nginx`) |

Database services in Compose match your project's configured database from `.myclirc.json`.

## Kubernetes (`my add kubernetes`)

Generates manifests under `k8s/`:

- `namespace.yaml` — dedicated namespace
- `deployment.yaml` — app deployment with health probes
- `service.yaml` — ClusterIP service
- `ingress.yaml` — ingress with optional TLS
- `configmap.yaml` — environment configuration
- `hpa.yaml` — horizontal pod autoscaler
- `K8S.md` — apply/upgrade instructions

Options: `--replicas`, `--host`

## Helm (`my add helm`)

Generates a chart at `helm/<appName>/`:

- `Chart.yaml`, `values.yaml`
- `templates/deployment.yaml`, `service.yaml`, `ingress.yaml`, `_helpers.tpl`
- `HELM.md` — install/upgrade commands

## Terraform

### Via `my add terraform` or `my deploy terraform`

| Provider | Target | Output path |
|----------|--------|-------------|
| `aws` | ECS Fargate | `deploy/terraform/aws/` |
| `gcp` | Cloud Run | `deploy/terraform/gcp/` |
| `azure` | Container Apps | `deploy/terraform/azure/` |

Each provider includes `main.tf`, `variables.tf`, and `TERRAFORM.md`. AWS also includes `network.tf`, `database.tf`, `storage.tf`, and `outputs.tf`.

`my deploy setup` and `my deploy terraform` also generate a unified `DEPLOYMENT.md` at the project root.

## PaaS deployment (`my deploy setup`)

| Provider | Output |
|----------|--------|
| `railway` | `railway.json` |
| `render` | `render.yaml` |
| `fly` | `fly.toml` |
| `vercel` | `vercel.json` |
| `netlify` | `netlify.toml` |
| `custom` | `deploy/<provider>/README.md` |

Cloud providers (`aws`, `gcp`, `azure`) route through Terraform generation.

## Official plugins

- `@mycli/docker` — Docker scaffolding via plugin install
- `@mycli/kubernetes` — K8s + Helm via plugin install
- `@mycli/aws` — AWS Terraform via plugin install
- `@mycli/azure` — Azure Terraform via plugin install
- `@mycli/gcp` — GCP Terraform via plugin install

## Managers

| Package | Responsibility |
|---------|----------------|
| `@mycli/docker-manager` | Dockerfile, Compose, nginx |
| `@mycli/kubernetes-manager` | K8s manifests, Helm charts |
| `@mycli/deployment-manager` | Terraform (AWS/GCP/Azure), PaaS configs |

All managers use EJS templates from `apps/cli/templates/features/`.
