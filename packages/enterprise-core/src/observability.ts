/**
 * Observability platform contracts (Phase 11).
 */
export type ObservabilityLoggerId = 'pino' | 'winston';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  correlationId?: string;
  traceId?: string;
  spanId?: string;
  [key: string]: unknown;
}

export interface StructuredLogger {
  child(bindings: LogContext): StructuredLogger;
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

export interface MetricLabels {
  [key: string]: string;
}

export interface CounterMetric {
  name: string;
  help: string;
  labels?: MetricLabels;
  value: number;
}

export interface HistogramMetric {
  name: string;
  help: string;
  labels?: MetricLabels;
  count: number;
  sum: number;
}

export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  attributes?: Record<string, string | number | boolean>;
}

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface AlertEvent {
  id: string;
  name: string;
  severity: AlertSeverity;
  message: string;
  firedAt: Date;
  labels?: MetricLabels;
}

export interface ErrorEvent {
  id: string;
  message: string;
  stack?: string;
  capturedAt: Date;
  correlationId?: string;
  traceId?: string;
  extras?: Record<string, unknown>;
}
