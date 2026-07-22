# IDE & DevContainer Guide (Phase 11)

MyCLI generates DevContainer, VS Code, and Cursor IDE configuration for consistent local development.

## Quick start

```bash
my add ide                         # VS Code + Cursor rules + IDE.md
my add ide --devcontainer          # IDE + DevContainer together
my add devcontainer                # DevContainer only
my create my-app --yes --ide       # Include IDE config during create
my create my-app --yes --devcontainer
my dev                             # Run dev script (detects package manager)
my test --dry-run                  # Preview test command
my doctor                          # Validates IDE/DevContainer features
```

## Node version toolchain (`my create`)

During `my create`, pick how Node.js versions are pinned for the project:

| Option | Generated files |
|--------|-----------------|
| **nvm** (default) | `.nvmrc` |
| **Volta** | `.nvmrc` + `volta.node` in `package.json` |
| **asdf** | `.tool-versions` |
| **None** | `.nvmrc` only (no extra manager config) |

```bash
my create my-app --yes --node-toolchain volta
my create my-app --yes --node-toolchain asdf
```

The choice is saved in `.myclirc.json` under `extensions.nodeToolchain`.

## IDE config (`my add ide`)

Generates:

| File | Purpose |
|------|---------|
| `.vscode/settings.json` | Format on save, TypeScript SDK, Vitest |
| `.vscode/extensions.json` | ESLint, Prettier, TypeScript, Vitest, Docker |
| `.vscode/launch.json` | Debug dev server and tests |
| `.cursor/rules/mycli-project.mdc` | Cursor AI project conventions |
| `IDE.md` | Setup documentation |

Options: `--devcontainer`, `--node-version`

## DevContainer (`my add devcontainer`)

Generates:

| File | Purpose |
|------|---------|
| `.devcontainer/devcontainer.json` | Node.js Dev Container (Codespaces compatible) |
| `.devcontainer/docker-compose.yml` | Optional when Docker feature/Dockerfile exists |
| `IDE.md` | DevContainer usage docs |

Uses `mcr.microsoft.com/devcontainers/javascript-node` with GitHub CLI feature.

## Workflow commands

| Command | Description |
|---------|-------------|
| `my dev` | Runs `package.json` `dev` script |
| `my test` | Runs test script |
| `my lint` | Runs lint script |
| `my build` | Runs build script |

All workflow commands auto-detect npm/pnpm/yarn/bun and support `--dry-run`.

## Manager

| Package | Responsibility |
|---------|----------------|
| `@mycli-cli/ide-manager` | DevContainer, VS Code, and Cursor scaffolding |

Templates live in `apps/cli/templates/features/ide/`.
