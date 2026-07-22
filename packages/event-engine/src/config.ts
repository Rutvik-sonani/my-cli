import { join } from 'node:path';
import type { EventSystemProvider } from '@mycli-cli/enterprise-core';

export interface EventSystemPathConfig {
  eventSystem?: string;
}

export interface EventSystemPaths {
  root: string;
  events: string;
  publishers: string;
  consumers: string;
  handlers: string;
  schemas: string;
  deadLetter: string;
}

export function resolveEventSystemPaths(config: EventSystemPathConfig = {}): EventSystemPaths {
  const root = config.eventSystem ?? 'src/event-system';

  return {
    root,
    events: join(root, 'events'),
    publishers: join(root, 'publishers'),
    consumers: join(root, 'consumers'),
    handlers: join(root, 'handlers'),
    schemas: join(root, 'schemas'),
    deadLetter: join(root, 'dead-letter'),
  };
}

export const EVENT_SYSTEM_PROVIDERS: EventSystemProvider[] = [
  'kafka',
  'rabbitmq',
  'nats',
  'redis',
  'eventbridge',
];

export function normalizeEventProvider(input: string): EventSystemProvider | null {
  const value = input.toLowerCase().replace(/_/g, '-');
  if (value === 'redis-streams' || value === 'redis-stream') return 'redis';
  if (value === 'aws-eventbridge' || value === 'event-bridge') return 'eventbridge';
  return EVENT_SYSTEM_PROVIDERS.includes(value as EventSystemProvider)
    ? (value as EventSystemProvider)
    : null;
}

export function getEventSystemDependencies(provider: EventSystemProvider): {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
} {
  switch (provider) {
    case 'kafka':
      return { dependencies: { kafkajs: '^2.2.4' }, devDependencies: {} };
    case 'rabbitmq':
      return {
        dependencies: { amqplib: '^0.10.5' },
        devDependencies: { '@types/amqplib': '^0.10.6' },
      };
    case 'nats':
      return { dependencies: { nats: '^2.28.2' }, devDependencies: {} };
    case 'eventbridge':
      return {
        dependencies: { '@aws-sdk/client-eventbridge': '^3.758.0' },
        devDependencies: {},
      };
    default:
      return { dependencies: { ioredis: '^5.4.2' }, devDependencies: {} };
  }
}

export function getEventSystemEnvLines(provider: EventSystemProvider, appName: string): string[] {
  const common = [`EVENTS_APP=${appName}`, 'EVENTS_DEFAULT_VERSION=1'];
  switch (provider) {
    case 'kafka':
      return [...common, 'KAFKA_BROKERS=localhost:9092', `KAFKA_TOPIC=${appName}.events`];
    case 'rabbitmq':
      return [
        ...common,
        'RABBITMQ_URL=amqp://guest:guest@localhost:5672',
        `RABBITMQ_EXCHANGE=${appName}.events`,
      ];
    case 'nats':
      return [...common, 'NATS_URL=nats://localhost:4222', `NATS_SUBJECT=${appName}.events`];
    case 'eventbridge':
      return [...common, 'AWS_REGION=us-east-1', `EVENTBRIDGE_BUS=${appName}-events`];
    default:
      return [...common, 'REDIS_URL=redis://localhost:6379', `REDIS_STREAM=${appName}:events`];
  }
}
