# Full-stack shop — Example

Reference for a full-stack app with auth, products API, Docker, and deployment docs.

Equivalent to:

```bash
my create shop --app-type full-stack --database postgresql --orm prisma
my add auth
my add frontend --framework next
my add docker
my deploy setup --provider railway
```

## Highlights

- Fastify API with `/health`, `/auth/*`, and `/api/products`
- Auth and product modules under `src/modules/`
- PostgreSQL + Prisma flags in `.myclirc.json`
- Frontend feature ready via `my add frontend --framework next`

## Structure

```
full-stack-shop/
├── .myclirc.json
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   └── modules/
│       ├── auth/routes.ts
│       └── products/
│           ├── routes.ts
│           └── store.ts
└── tests/
    └── products.test.ts
```

## Run

```bash
cd examples/full-stack-shop
pnpm install --ignore-workspace
pnpm test
pnpm build && pnpm start
```

## Next steps

```bash
my make module product --fields name:string,price:number
my add rbac
my docs generate --only api-guide
my backup run --dry-run
```

See [docs/getting-started.md](../../docs/getting-started.md).
