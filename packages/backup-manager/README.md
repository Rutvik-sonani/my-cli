# @mycli-cli/backup-manager

Plans and runs database backups for generated MyCLI projects (PostgreSQL, MySQL, MongoDB, SQLite).

## CLI commands

| Command | Description |
|---------|-------------|
| `my backup run` | Execute a backup using the configured database |
| `my backup run --dry-run` | Preview `pg_dump` / `mysqldump` / etc. commands |
| `my backup list` | List files in the backup output directory |

## Outputs

| Path | Purpose |
|------|---------|
| `backups/<database>-<timestamp>.sql` | Backup artifact (provider-dependent extension) |
| `docs/backup.md` | Backup and restore documentation |

## API

```ts
import { createBackupManager } from '@mycli-cli/backup-manager';

const backup = createBackupManager({ cwd: process.cwd(), templatesRoot: 'templates' });
await backup.run({ database: 'postgresql', outputDir: 'backups', dryRun: true });
```

## Tests

```bash
pnpm --filter @mycli-cli/backup-manager test
```

See [SERVICES_GUIDE.md](../../SERVICES_GUIDE.md).
