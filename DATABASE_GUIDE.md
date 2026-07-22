# Database Guide (Phase 9)

Phase 9 adds **full ORM coverage** and **per-database plugins** for all supported engines.

## Supported databases

| Engine | Env key | ORMs |
|--------|---------|------|
| PostgreSQL | `DATABASE_URL` | Prisma, Drizzle, TypeORM, Sequelize, MikroORM |
| MySQL / MariaDB | `DATABASE_URL` | Prisma, Drizzle, TypeORM, Sequelize, MikroORM |
| SQLite | `DATABASE_URL` | Prisma, Drizzle, TypeORM, Sequelize, MikroORM |
| MongoDB | `DATABASE_URL` | Prisma, Mongoose, MikroORM |
| CockroachDB | `DATABASE_URL` | Prisma, Drizzle, TypeORM, Sequelize, MikroORM |
| SQL Server | `DATABASE_URL` | Prisma, TypeORM, Sequelize, MikroORM |
| Redis | `REDIS_URL` | (cache only — no ORM scaffold) |

## Commands

```bash
# During create
my create my-app --database mysql --orm typeorm
my create my-app --database mongodb --orm mongoose

# Add to existing project
my add database --database postgresql --orm drizzle
my add database --database mongodb --orm mongoose

# Marketplace plugins
my plugin install @mycli-cli/mysql
my plugin install @mycli-cli/mongodb
my plugin install @mycli-cli/postgres
my plugin install @mycli-cli/mariadb
my plugin install @mycli-cli/sqlite
my plugin install @mycli-cli/redis
my plugin install @mycli-cli/sqlserver
my plugin install @mycli-cli/cockroachdb
```

## Generated files by ORM

| ORM | Key outputs |
|-----|-------------|
| Prisma | `prisma/schema.prisma`, `prisma/seed.ts`, `src/database/prisma.client.ts` |
| Drizzle | `src/database/schema.ts`, `drizzle.config.ts` |
| TypeORM | `src/database/data-source.ts`, `src/database/entities/` |
| Mongoose | `src/database/connection.ts`, `src/database/models/` |
| Sequelize | `src/database/sequelize/config.ts`, `src/database/sequelize/models/` |
| MikroORM | `src/database/mikro-orm.config.ts`, `src/database/entities/` |

Official database plugins: `@mycli-cli/postgres`, `@mycli-cli/mysql`, `@mycli-cli/mongodb`, `@mycli-cli/mariadb`, `@mycli-cli/sqlite`, `@mycli-cli/redis`, `@mycli-cli/sqlserver`, `@mycli-cli/cockroachdb`.

Each database plugin also writes `docs/database-<engine>.md` with local dev and production guidance.
