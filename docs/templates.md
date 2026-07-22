# Templates

## Source of truth

All EJS templates used by the CLI are in:

```
apps/cli/templates/
├── features/      # my add, create wizard, deploy
├── generators/    # my make <type>
└── architecture/  # architecture-manager layouts
```

The root `templates/` directory documents architecture categories only. See [templates/README.md](../templates/README.md).

## Rendering

Managers use `@mycli/template-engine`:

```ts
const templates = createTemplateEngine({
  filesystem: fs,
  templatesRoot: resolveTemplatesRoot(), // → apps/cli/templates
});
await templates.renderFile('features/docker/Dockerfile.ejs', { data });
```

`resolveTemplatesRoot()` is defined in `apps/cli/src/paths.ts` and copied to `apps/cli/dist/templates` on build.

## Adding a feature template

1. Create `apps/cli/templates/features/<feature>/*.ejs`
2. Add generation logic in the matching `*-manager` package
3. Expose via `my add <feature>` in `apps/cli/src/commands/add.ts`
4. Add manager tests with `featureTemplatesRoot()` helper pointing at `apps/cli/templates`

## Generators

See [GENERATOR_GUIDE.md](../GENERATOR_GUIDE.md) for `my make` generator registration in `apps/cli/src/commands/make.ts`.
