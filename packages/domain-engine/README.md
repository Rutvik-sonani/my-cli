# @mycli/domain-engine

Phase 2 **DDD domain generator** for MyCLI.

## CLI

```bash
my make domain user
my make domain order --fields name:string,total:number
```

## Generated layout

For `my make domain user`:

```
src/domain/user/
  entities/User.ts
  value-objects/Email.ts
  aggregates/UserAggregate.ts
  events/UserCreated.ts
  index.ts
  tests/user.domain.test.ts
src/application/
  commands/CreateUserCommand.ts
  queries/GetUserQuery.ts
  services/UserApplicationService.ts
src/infrastructure/database/
  interfaces/IUserRepository.ts
  repositories/UserRepository.ts
```

Domain files have **no** framework, database, or HTTP imports.

## Paths

Reads `.myclirc.json` paths (`domain`, `application`, `infrastructure`) from Phase 1 architecture setup.

## Tests

```bash
pnpm --filter @mycli/domain-engine test
```
