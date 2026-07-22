import { describe, expect, it } from 'vitest';
import { normalizeFeatureFlagProvider } from '../src/config.js';
import {
  DatabaseFeatureFlagProvider,
  InMemoryFeatureFlagStore,
  createFeatureFlagProvider,
  evaluateDefinition,
  percentageBucket,
} from '../src/runtime/feature-flag-service.js';

describe('feature flag evaluation', () => {
  it('evaluates boolean enabled/disabled flags', () => {
    expect(evaluateDefinition({ key: 'a', enabled: true }).enabled).toBe(true);
    expect(evaluateDefinition({ key: 'a', enabled: false }).reason).toBe('disabled');
  });

  it('supports user, environment, and country targeting', () => {
    const def = {
      key: 'checkout',
      enabled: true,
      userTargets: ['u1'],
      environments: ['staging'],
      countries: ['US'],
    };
    expect(
      evaluateDefinition(def, { userId: 'u1', environment: 'staging', country: 'US' }).reason,
    ).toBe('user-target');
    expect(
      evaluateDefinition(def, { userId: 'u2', environment: 'production', country: 'US' }).reason,
    ).toBe('environment');
    expect(
      evaluateDefinition(def, { userId: 'u2', environment: 'staging', country: 'DE' }).reason,
    ).toBe('country');
  });

  it('applies stable percentage rollout', () => {
    const bucket = percentageBucket('checkout', 'user-42');
    expect(bucket).toBeGreaterThanOrEqual(0);
    expect(bucket).toBeLessThan(100);

    const low = evaluateDefinition(
      { key: 'checkout', enabled: true, percentage: 0 },
      { userId: 'user-42' },
    );
    expect(low.enabled).toBe(false);

    const high = evaluateDefinition(
      { key: 'checkout', enabled: true, percentage: 100 },
      { userId: 'user-42' },
    );
    expect(high.enabled).toBe(true);
  });
});

describe('providers', () => {
  it('database provider evaluates stored definitions', async () => {
    const store = new InMemoryFeatureFlagStore();
    store.set({ key: 'dark-mode', enabled: true });
    const provider = new DatabaseFeatureFlagProvider(store);
    await provider.connect();
    expect(await provider.isEnabled('dark-mode')).toBe(true);
  });

  it('creates launchdarkly and unleash providers', async () => {
    const ld = createFeatureFlagProvider('launchdarkly');
    const unleash = createFeatureFlagProvider('unleash');
    expect(ld.id).toBe('launchdarkly');
    expect(unleash.id).toBe('unleash');
    await ld.connect();
    expect(await ld.isEnabled('missing')).toBe(false);
  });
});

describe('config', () => {
  it('normalizes provider ids', () => {
    expect(normalizeFeatureFlagProvider('db')).toBe('database');
    expect(normalizeFeatureFlagProvider('ld')).toBe('launchdarkly');
    expect(normalizeFeatureFlagProvider('unleash')).toBe('unleash');
    expect(normalizeFeatureFlagProvider('nope')).toBeNull();
  });
});
