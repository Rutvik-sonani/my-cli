# @mycli-cli/core

Foundation package for MyCLI: dependency injection, application context, events, logging, errors, and shared utilities.

## Responsibilities

- `ApplicationContext` — root runtime context
- `Container` — DI with singleton/transient lifetimes
- `EventBus` — typed async events
- `Logger` — leveled logging with transports
- Typed error hierarchy (`MyCliError`, `CommandError`, …)
- `Result` monad helpers
- String and merge utilities

## Usage

```ts
import { ApplicationContext } from '@mycli-cli/core';

const ctx = new ApplicationContext({ cwd: process.cwd(), version: '1.0.0' });
await ctx.boot();
```
