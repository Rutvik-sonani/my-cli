# @mycli/template-marketplace-engine

Enterprise template marketplace for MyCLI (Phase 16).

## CLI

```bash
my template setup
my template search api
my template install api-crud
my template publish ./my-template
```

## Visibility

- **public** — shared catalog templates
- **private** — project-local catalog
- **organization** — company-scoped templates

## Metadata

`name` · `version` · `author` · `compatibility` · `requirements`

## Layout

```
src/template-marketplace/
  catalog/
  client/
  providers/
.mycli/template-catalog/
templates/installed/
TEMPLATE_MARKETPLACE.md
```
