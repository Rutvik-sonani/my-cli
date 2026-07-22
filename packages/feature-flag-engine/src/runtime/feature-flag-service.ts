import { createHash } from 'node:crypto';
import type {
  FeatureFlagContext,
  FeatureFlagDefinition,
  FeatureFlagEvaluation,
  FeatureFlagProvider,
  FeatureFlagProviderId,
} from '@mycli-cli/enterprise-core';

/**
 * Stable 0–99 bucket for percentage rollout based on flag key + user id.
 */
export function percentageBucket(flagKey: string, userId: string): number {
  const hash = createHash('sha256').update(`${flagKey}:${userId}`).digest();
  return hash[0]! % 100;
}

export function evaluateDefinition(
  definition: FeatureFlagDefinition | undefined,
  context: FeatureFlagContext = {},
): FeatureFlagEvaluation {
  if (!definition) {
    return { key: 'unknown', enabled: false, reason: 'default' };
  }

  const key = definition.key;

  if (!definition.enabled) {
    return { key, enabled: false, reason: 'disabled' };
  }

  if (definition.environments && definition.environments.length > 0) {
    if (!context.environment || !definition.environments.includes(context.environment)) {
      return { key, enabled: false, reason: 'environment' };
    }
  }

  if (definition.countries && definition.countries.length > 0) {
    if (!context.country || !definition.countries.includes(context.country.toUpperCase())) {
      return { key, enabled: false, reason: 'country' };
    }
  }

  if (definition.userTargets && context.userId && definition.userTargets.includes(context.userId)) {
    return { key, enabled: true, reason: 'user-target' };
  }

  if (typeof definition.percentage === 'number') {
    const pct = Math.max(0, Math.min(100, definition.percentage));
    if (pct <= 0) {
      return { key, enabled: false, reason: 'percentage' };
    }
    if (pct >= 100) {
      return { key, enabled: true, reason: 'percentage' };
    }
    const userId = context.userId ?? 'anonymous';
    const enabled = percentageBucket(key, userId) < pct;
    return { key, enabled, reason: 'percentage' };
  }

  return { key, enabled: true, reason: 'enabled' };
}

export class InMemoryFeatureFlagStore {
  private readonly flags = new Map<string, FeatureFlagDefinition>();

  set(definition: FeatureFlagDefinition): void {
    this.flags.set(definition.key, { ...definition });
  }

  get(key: string): FeatureFlagDefinition | undefined {
    return this.flags.get(key);
  }

  all(): FeatureFlagDefinition[] {
    return [...this.flags.values()];
  }

  clear(): void {
    this.flags.clear();
  }
}

/**
 * Database / local provider evaluating boolean, percentage, user, env, country rules.
 */
export class DatabaseFeatureFlagProvider implements FeatureFlagProvider {
  readonly id: FeatureFlagProviderId = 'database';
  private connected = false;

  constructor(private readonly store: InMemoryFeatureFlagStore = new InMemoryFeatureFlagStore()) {}

  getStore(): InMemoryFeatureFlagStore {
    return this.store;
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async evaluate(key: string, context: FeatureFlagContext = {}): Promise<FeatureFlagEvaluation> {
    if (!this.connected) {
      await this.connect();
    }
    return evaluateDefinition(this.store.get(key), context);
  }

  async isEnabled(key: string, context: FeatureFlagContext = {}): Promise<boolean> {
    return (await this.evaluate(key, context)).enabled;
  }

  async getAllFlags(context: FeatureFlagContext = {}): Promise<Record<string, boolean>> {
    const result: Record<string, boolean> = {};
    for (const flag of this.store.all()) {
      result[flag.key] = (await this.evaluate(flag.key, context)).enabled;
    }
    return result;
  }
}

/**
 * LaunchDarkly adapter stub — evaluates local definitions until the SDK is wired.
 */
export class LaunchDarklyFeatureFlagProvider implements FeatureFlagProvider {
  readonly id: FeatureFlagProviderId = 'launchdarkly';
  private readonly fallback: DatabaseFeatureFlagProvider;

  constructor(store?: InMemoryFeatureFlagStore) {
    this.fallback = new DatabaseFeatureFlagProvider(store);
  }

  async connect(): Promise<void> {
    await this.fallback.connect();
  }

  async disconnect(): Promise<void> {
    await this.fallback.disconnect();
  }

  async evaluate(key: string, context?: FeatureFlagContext): Promise<FeatureFlagEvaluation> {
    return this.fallback.evaluate(key, context);
  }

  async isEnabled(key: string, context?: FeatureFlagContext): Promise<boolean> {
    return this.fallback.isEnabled(key, context);
  }
}

/**
 * Unleash adapter stub — evaluates local definitions until the client is wired.
 */
export class UnleashFeatureFlagProvider implements FeatureFlagProvider {
  readonly id: FeatureFlagProviderId = 'unleash';
  private readonly fallback: DatabaseFeatureFlagProvider;

  constructor(store?: InMemoryFeatureFlagStore) {
    this.fallback = new DatabaseFeatureFlagProvider(store);
  }

  async connect(): Promise<void> {
    await this.fallback.connect();
  }

  async disconnect(): Promise<void> {
    await this.fallback.disconnect();
  }

  async evaluate(key: string, context?: FeatureFlagContext): Promise<FeatureFlagEvaluation> {
    return this.fallback.evaluate(key, context);
  }

  async isEnabled(key: string, context?: FeatureFlagContext): Promise<boolean> {
    return this.fallback.isEnabled(key, context);
  }
}

export class FeatureFlagService {
  constructor(private readonly provider: FeatureFlagProvider) {}

  getProvider(): FeatureFlagProvider {
    return this.provider;
  }

  async isEnabled(key: string, context?: FeatureFlagContext): Promise<boolean> {
    return this.provider.isEnabled(key, context);
  }

  async evaluate(key: string, context?: FeatureFlagContext): Promise<FeatureFlagEvaluation> {
    return this.provider.evaluate(key, context);
  }
}

export function createFeatureFlagProvider(
  id: FeatureFlagProviderId,
  store?: InMemoryFeatureFlagStore,
): FeatureFlagProvider {
  switch (id) {
    case 'launchdarkly':
      return new LaunchDarklyFeatureFlagProvider(store);
    case 'unleash':
      return new UnleashFeatureFlagProvider(store);
    default:
      return new DatabaseFeatureFlagProvider(store);
  }
}
