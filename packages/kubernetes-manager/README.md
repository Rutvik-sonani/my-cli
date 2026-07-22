# @mycli-cli/kubernetes-manager

Generates Kubernetes manifests and Helm charts for containerized MyCLI applications.

## CLI commands

| Command | Description |
|---------|-------------|
| `my add kubernetes` | Deployment, Service, Ingress, HPA, docs |
| `my add helm` | Helm chart under `helm/<app>/` |
| `my add kubernetes --host api.example.com` | Custom ingress host |

## Outputs

| Feature | Files |
|---------|-------|
| Kubernetes | `k8s/deployment.yaml`, `k8s/service.yaml`, `k8s/ingress.yaml`, `k8s/hpa.yaml`, `K8S.md` |
| Helm | `helm/<app>/Chart.yaml`, `helm/<app>/values.yaml`, `helm/<app>/templates/*`, `HELM.md` |

Templates: `apps/cli/templates/features/kubernetes/`, `features/helm/`.

## Tests

```bash
pnpm --filter @mycli-cli/kubernetes-manager test
```

See [INFRA_GUIDE.md](../../INFRA_GUIDE.md).
