# @mycli-cli/generator-engine

Laravel Artisan-style generators with EJS templates and automatic registration.

## Features

- Template-backed generators (`createTemplateGenerator`)
- Field parsing & type mapping (`name:string,price:number,email?:email,category:relation:Category`)
- Auto-registration:
  - Module barrel (`src/modules/index.ts`)
  - Route factories (`src/routes/index.ts`)
  - DI providers (`src/providers/index.ts`)
  - OpenAPI schema merge (`openapi.json`)
- Idempotent marker blocks (`// <mycli:exports>`) — never silently overwrite user code
- Generator hooks (`beforeGenerate` / `afterGenerate`)

## Usage

```ts
import { createGeneratorEngine, createTemplateGenerator, parseFields } from '@mycli-cli/generator-engine';

engine.register(createTemplateGenerator({
  name: 'module',
  templateDir: 'generators/module',
  outputDir: (_ctx, names) => `src/modules/${names.kebab}`,
  autoRegister: true,
}));

await engine.run('module', 'user', {
  fields: parseFields('name:string,email:email'),
});
```
