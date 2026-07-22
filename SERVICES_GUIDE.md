# Infrastructure Services Guide (Phase 12)

MyCLI generates production-ready service modules for cache, queues, domain events, email, file storage, and payments.

## Quick start

```bash
my add cache
my add queue
my add events
my add mail --provider smtp
my add storage --provider s3
my add upload --provider s3
my add payment --provider stripe
my doctor
```

## Services

| Command | Module | Dependencies |
|---------|--------|--------------|
| `my add cache` | `src/services/cache/` | `ioredis` (redis), none (memory), `memcached` |
| `my add queue` | `src/services/queue/` | `bullmq`+`ioredis`, `amqplib`, `kafkajs`, `@aws-sdk/client-sqs` |
| `my add events` | `src/services/events/` | `ioredis` |
| `my add mail` | `src/services/mail/` | `nodemailer` |
| `my add storage` | `src/services/storage/` | `@aws-sdk/client-s3` |
| `my add upload` | `src/services/storage/` + upload route | `@aws-sdk/client-s3`, `@fastify/multipart` |
| `my add payment` | `src/services/payment/` | `stripe` |

Each command:

- Generates service source files under `src/services/<name>/`
- Appends environment variables to `.env.example`
- Writes `docs/<service>.md` and updates `SERVICES.md`
- Registers exports in `src/services/index.ts`
- Installs npm dependencies

## Providers

Use `--provider` where supported:

| Service | Providers |
|---------|-----------|
| Cache | `redis` (default), `memory`, `memcached` |
| Queue | `bullmq` (default), `rabbitmq`, `kafka`, `sqs` |
| Mail | `smtp` (default), `sendgrid`, `mailgun` |
| Storage / Upload | `s3` (default), `local` |
| Payment | `stripe` (default) |

## Payment webhooks

`my add payment` registers `POST /webhooks/stripe` in `src/routes/features.ts`.

Configure `STRIPE_WEBHOOK_SECRET` in `.env`.

## Manager

| Package | Responsibility |
|---------|----------------|
| `@mycli/services-manager` | Cache, queue, events, mail, storage, payment scaffolding |

Templates live in `apps/cli/templates/features/services/`.
