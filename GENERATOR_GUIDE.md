# Generator Guide

## Overview

Generators are registered with `@mycli/generator-engine` and render EJS templates.

```bash
my make module user
my make crud product --fields name:string,price:number,description:text
my make controller auth
my make service payment
my make repository product
my make dto login
my make middleware auth
my make validator register
my make resource product
my make migration create_users
```

## Creating a generator

```ts
import { createTemplateGenerator } from '@mycli/generator-engine';

export const moduleGenerator = createTemplateGenerator({
  name: 'module',
  templateDir: 'generators/module',
  outputDir: (ctx, names) => `src/modules/${names.kebab}`,
});
```

## Generators

```bash
my make list
my make module user --fields name:string,email:email
my make crud product --fields name:string,price:number,description:text,category:relation:Category
my make controller auth
my make service payment
my make repository product
my make model order --fields total:number,status:string
my make dto login --fields email:email,password:string
my make middleware auth
my make validator register --fields email:email,password:string
my make resource product --fields name:string,price:number
my make event order
my make queue send-welcome
my make mail order-confirmation
my make migration create_users --fields email:string
```

Generators auto-register modules into:

- `src/modules/index.ts` (barrel exports)
- `src/routes/index.ts` (route factories)
- `src/providers/index.ts` (DI providers)
- `openapi.json` (when present)

Use `--no-register` to skip auto-registration and `--dry-run` to preview.

## Migrations

`my make migration` reads the ORM from `.myclirc.json` and generates real migration artifacts:

| ORM | Output |
|-----|--------|
| Prisma | `prisma/migrations/<timestamp>_create_<table>/migration.sql` + appends model to `schema.prisma` |
| Drizzle | `drizzle/<timestamp>_create_<table>.sql` + appends table to `src/database/schema.ts` |
| TypeORM | `src/database/migrations/<timestamp>-Create<Entity>.ts` |
| Sequelize | `src/database/migrations/<timestamp>-create-<entity>.js` |
| Mongoose | `src/database/migrations/<timestamp>-create-<entity>.ts` |

`my make crud` automatically emits migrations for the configured ORM.
