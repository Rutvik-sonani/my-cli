# Minimal API — Example

A reference layout equivalent to:

```bash
my create minimal-api --yes --app-type api --database postgresql --orm prisma
```

## Structure

```
minimal-api/
├── .myclirc.json    # MyCLI project config
├── package.json
├── tsconfig.json
└── src/
    └── index.ts     # Fastify entrypoint
```

## Recreate with MyCLI

```bash
my create minimal-api --yes --skip-install
cd minimal-api
my add docker
my doctor
```

## Use as a template

Copy this folder or run `my create` with matching options. See [docs/getting-started.md](../docs/getting-started.md).
