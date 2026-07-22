# MyCLI Templates Layout

MyCLI project templates live in **`apps/cli/templates/`**, not in this root directory.

This folder documents architecture-oriented entry points. Use `my create` and managers under `packages/*-manager` to render EJS templates from `apps/cli/templates/`.

## Directory map

| Path | Purpose |
|------|---------|
| `apps/cli/templates/features/` | Feature scaffolding (auth, docker, terraform, services, git, …) |
| `apps/cli/templates/generators/` | `my make` code generators (module, crud, queue, mail, …) |
| `apps/cli/templates/architecture/` | Architecture layouts (monolith, monorepo, microservice, …) |

## Architecture stubs (this folder)

| Subfolder | Used by |
|-----------|---------|
| `monolith/` | Single-app layout reference |
| `modular-monolith/` | Default `my create` architecture |
| `microservice/` | Service-oriented layout |
| `monorepo/` | Multi-package workspace layout |
| `polyrepo/` | Multi-repo guidance |
| `backend/` | Backend-only project patterns |
| `frontend/` | Frontend-only project patterns |

These subfolders are placeholders for future shared partials. **All active templates are under `apps/cli/templates/`.**

## Adding templates

1. Add EJS files under `apps/cli/templates/features/<feature>/` or `generators/<name>/`
2. Wire generation in the matching `*-manager` package or `apps/cli/src/commands/`
3. Add tests in the manager package and/or `apps/cli/tests/`

See [docs/templates.md](../docs/templates.md) and [GENERATOR_GUIDE.md](../GENERATOR_GUIDE.md).
