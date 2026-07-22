import { describe, expect, it } from 'vitest';
import {
  EVENT_SYSTEM_PROVIDERS,
  getEventSystemDependencies,
  normalizeEventProvider,
} from '../src/config.js';

describe('event-engine config', () => {
  it('lists all enterprise providers', () => {
    expect(EVENT_SYSTEM_PROVIDERS).toEqual(['kafka', 'rabbitmq', 'nats', 'redis', 'eventbridge']);
  });

  it('normalizes provider aliases', () => {
    expect(normalizeEventProvider('redis-streams')).toBe('redis');
    expect(normalizeEventProvider('aws-eventbridge')).toBe('eventbridge');
    expect(normalizeEventProvider('unknown')).toBeNull();
  });

  it('returns provider-specific dependencies', () => {
    expect(getEventSystemDependencies('kafka').dependencies.kafkajs).toBeDefined();
    expect(getEventSystemDependencies('rabbitmq').dependencies.amqplib).toBeDefined();
    expect(getEventSystemDependencies('nats').dependencies.nats).toBeDefined();
    expect(
      getEventSystemDependencies('eventbridge').dependencies['@aws-sdk/client-eventbridge'],
    ).toBeDefined();
  });
});
