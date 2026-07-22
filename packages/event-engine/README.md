# @mycli/event-engine

Enterprise event-driven system for MyCLI (Phase 4).

## CLI

```bash
my add event-system --provider redis
my add event-system --provider kafka
my make integration-event order-placed
```

## Providers

- Kafka (`kafkajs`)
- RabbitMQ (`amqplib`)
- NATS (`nats`)
- Redis Streams (`ioredis`)
- AWS EventBridge (`@aws-sdk/client-eventbridge`)

## Features

- `EventPublisher` interface with provider implementations
- Event serialization with versioning
- Retry policy with exponential backoff
- Dead-letter queue for failed handlers

## Generated layout

```
src/event-system/
  events/
  publishers/
  consumers/
  handlers/
  schemas/
  dead-letter/
tests/event-system/
EVENT_SYSTEM.md
```

## Runtime (package tests)

- `JsonEventSerializer` — versioned JSON envelopes
- `withRetry` — retry with backoff
- `DeadLetterQueue` — failed event storage
- `InMemoryEventPublisher` — local pub/sub for tests
