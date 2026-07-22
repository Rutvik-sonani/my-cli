/**
 * Feature flag platform contracts (Phase 10).
 */
export type FeatureFlagProviderId = 'database' | 'launchdarkly' | 'unleash';

export interface FeatureFlagContext {
  userId?: string;
  email?: string;
  environment?: string;
  country?: string;
  attributes?: Record<string, string | number | boolean>;
}

export interface FeatureFlagDefinition {
  key: string;
  enabled: boolean;
  /** 0–100 percentage rollout when enabled */
  percentage?: number;
  /** User ids that always receive the flag */
  userTargets?: string[];
  /** Environments where the flag is active (empty = all) */
  environments?: string[];
  /** ISO country codes where the flag is active (empty = all) */
  countries?: string[];
  description?: string;
}

export interface FeatureFlagEvaluation {
  key: string;
  enabled: boolean;
  reason:
    | 'disabled'
    | 'enabled'
    | 'user-target'
    | 'percentage'
    | 'environment'
    | 'country'
    | 'default';
}

export interface FeatureFlagProvider {
  readonly id: FeatureFlagProviderId;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isEnabled(key: string, context?: FeatureFlagContext): Promise<boolean>;
  evaluate(key: string, context?: FeatureFlagContext): Promise<FeatureFlagEvaluation>;
  getAllFlags?(context?: FeatureFlagContext): Promise<Record<string, boolean>>;
}
