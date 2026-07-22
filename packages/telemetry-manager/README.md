# @mycli-cli/telemetry-manager

Opt-in, anonymous telemetry for MyCLI. **Disabled by default.**

## What is collected

- Anonymous ID (UUID, stored in project config when opted in)
- CLI version, Node.js version, OS platform
- Event name and coarse properties (e.g. `applicationType`, `architecture`)

## What is never collected

- Source code, file paths, or repository names
- Environment variables, secrets, tokens, or passwords
- Database URLs or connection strings
- Usernames, emails, or hostnames

Sensitive property keys (`password`, `token`, `secret`, `path`, `file`, `env`) are stripped before enqueueing.

## Transport

Set an endpoint to deliver batched events on CLI shutdown:

```bash
export MYCLI_TELEMETRY_URL=https://telemetry.example.com/v1/events
my create my-app   # after opting in during the wizard
```

If `MYCLI_TELEMETRY_URL` is unset, events are queued in memory and discarded on flush (no network calls).

Transport uses a single `fetch` POST with `{ events: TelemetryPayload[] }`. Retries are intentionally disabled to keep behavior predictable and privacy-safe.

## Enable / disable

During `my create`, answer **Help improve MyCLI?** or set in `.myclirc.json`:

```json
{
  "telemetry": { "enabled": true }
}
```

Programmatically:

```typescript
import { createTelemetryManager } from '@mycli-cli/telemetry-manager';

const telemetry = createTelemetryManager({ enabled: true });
telemetry.track('create', { applicationType: 'api' });
await telemetry.flush();
```
