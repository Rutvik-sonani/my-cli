# Examples

Reference projects generated with MyCLI. Regenerate with:

```bash
pnpm my create minimal-api --yes --skip-install --skip-git
pnpm my create full-stack-shop --yes --app-type full-stack --skip-install --skip-git
pnpm my create enterprise-demo --yes --app-type enterprise-saas --skip-install --skip-git
```

| Example | Type | Highlights |
|---------|------|------------|
| `minimal-api` | API | Fastify + PostgreSQL + Prisma + health check |
| `full-stack-shop` | Full stack | API + React frontend scaffold |

Each example includes `package.json`, `src/`, and can be extended with `my add auth`, `my make module`, etc.
