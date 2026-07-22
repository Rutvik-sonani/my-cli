import { join } from 'node:path';
import type { ObservabilityLoggerId } from '@mycli-cli/enterprise-core';

export interface ObservabilityPathConfig {
  observability?: string;
}

export interface ObservabilityPaths {
  root: string;
  logging: string;
  metrics: string;
  tracing: string;
  alerts: string;
  errors: string;
}

export function resolveObservabilityPaths(
  config: ObservabilityPathConfig = {},
): ObservabilityPaths {
  const root = config.observability ?? 'src/observability';

  return {
    root,
    logging: join(root, 'logging'),
    metrics: join(root, 'metrics'),
    tracing: join(root, 'tracing'),
    alerts: join(root, 'alerts'),
    errors: join(root, 'errors'),
  };
}

export const OBSERVABILITY_LOGGERS: ObservabilityLoggerId[] = ['pino', 'winston'];

export function normalizeObservabilityLogger(input: string): ObservabilityLoggerId | null {
  const value = input.toLowerCase().replace(/_/g, '-');
  return OBSERVABILITY_LOGGERS.includes(value as ObservabilityLoggerId)
    ? (value as ObservabilityLoggerId)
    : null;
}

export function getObservabilityEnvLines(appName: string, logger: ObservabilityLoggerId): string[] {
  return [
    `OTEL_SERVICE_NAME=${appName}`,
    'LOG_LEVEL=info',
    `LOG_LIBRARY=${logger}`,
    'METRICS_ENABLED=true',
    'TRACING_ENABLED=true',
    'SENTRY_DSN=',
    'SENTRY_ENVIRONMENT=development',
    'ALERTS_ENABLED=true',
  ];
}

export function getObservabilityDependencies(logger: ObservabilityLoggerId): {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
} {
  const dependencies: Record<string, string> = {
    '@opentelemetry/api': '^1.9.0',
    '@opentelemetry/sdk-node': '^0.57.1',
    '@opentelemetry/auto-instrumentations-node': '^0.55.3',
    'prom-client': '^15.1.3',
    '@sentry/node': '^8.47.0',
  };
  const devDependencies: Record<string, string> = {};

  if (logger === 'pino') {
    dependencies.pino = '^9.6.0';
    dependencies['pino-pretty'] = '^13.0.0';
  } else {
    dependencies.winston = '^3.17.0';
  }

  return { dependencies, devDependencies };
}
