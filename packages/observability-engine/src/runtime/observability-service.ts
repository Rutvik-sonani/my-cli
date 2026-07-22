import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type {
  AlertEvent,
  AlertSeverity,
  ErrorEvent,
  LogContext,
  LogLevel,
  MetricLabels,
  StructuredLogger,
  TraceSpan,
} from '@mycli/enterprise-core';

export interface CorrelationState {
  correlationId: string;
  traceId: string;
  spanId?: string;
}

const correlationStorage = new AsyncLocalStorage<CorrelationState>();

export function createCorrelationId(): string {
  return randomUUID();
}

export function getCorrelation(): CorrelationState | undefined {
  return correlationStorage.getStore();
}

export function runWithCorrelation<T>(state: CorrelationState, fn: () => T): T {
  return correlationStorage.run(state, fn);
}

export class ConsoleStructuredLogger implements StructuredLogger {
  constructor(
    private readonly bindings: LogContext = {},
    private readonly sink: Array<{ level: LogLevel; message: string; context: LogContext }> = [],
  ) {}

  getSink() {
    return this.sink;
  }

  child(bindings: LogContext): StructuredLogger {
    return new ConsoleStructuredLogger({ ...this.bindings, ...bindings }, this.sink);
  }

  private write(level: LogLevel, message: string, context: LogContext = {}): void {
    const correlation = getCorrelation();
    const merged: LogContext = {
      ...this.bindings,
      ...context,
      correlationId:
        context.correlationId ?? correlation?.correlationId ?? this.bindings.correlationId,
      traceId: context.traceId ?? correlation?.traceId ?? this.bindings.traceId,
      spanId: context.spanId ?? correlation?.spanId ?? this.bindings.spanId,
    };
    this.sink.push({ level, message, context: merged });
  }

  debug(message: string, context?: LogContext): void {
    this.write('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.write('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.write('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.write('error', message, context);
  }
}

function labelKey(labels?: MetricLabels): string {
  if (!labels) return '';
  return Object.keys(labels)
    .sort()
    .map((key) => `${key}=${labels[key]}`)
    .join(',');
}

export class MetricsRegistry {
  private readonly counters = new Map<string, { help: string; values: Map<string, number> }>();
  private readonly histograms = new Map<
    string,
    { help: string; values: Map<string, { count: number; sum: number }> }
  >();

  counter(name: string, help: string, labels?: MetricLabels): void {
    const entry = this.counters.get(name) ?? { help, values: new Map() };
    const key = labelKey(labels);
    entry.values.set(key, (entry.values.get(key) ?? 0) + 1);
    this.counters.set(name, entry);
  }

  observe(name: string, help: string, value: number, labels?: MetricLabels): void {
    const entry = this.histograms.get(name) ?? { help, values: new Map() };
    const key = labelKey(labels);
    const current = entry.values.get(key) ?? { count: 0, sum: 0 };
    current.count += 1;
    current.sum += value;
    entry.values.set(key, current);
    this.histograms.set(name, entry);
  }

  /** Prometheus text exposition format */
  scrape(): string {
    const lines: string[] = [];
    for (const [name, entry] of this.counters) {
      lines.push(`# HELP ${name} ${entry.help}`);
      lines.push(`# TYPE ${name} counter`);
      for (const [labels, value] of entry.values) {
        lines.push(labels ? `${name}{${labels}} ${value}` : `${name} ${value}`);
      }
    }
    for (const [name, entry] of this.histograms) {
      lines.push(`# HELP ${name} ${entry.help}`);
      lines.push(`# TYPE ${name} summary`);
      for (const [labels, value] of entry.values) {
        const suffix = labels ? `{${labels}}` : '';
        lines.push(`${name}_count${suffix} ${value.count}`);
        lines.push(`${name}_sum${suffix} ${value.sum}`);
      }
    }
    return `${lines.join('\n')}\n`;
  }
}

export class Tracer {
  private readonly spans: TraceSpan[] = [];

  startSpan(
    name: string,
    options: {
      traceId?: string;
      parentSpanId?: string;
      attributes?: Record<string, string | number | boolean>;
    } = {},
  ): TraceSpan {
    const correlation = getCorrelation();
    const span: TraceSpan = {
      traceId: options.traceId ?? correlation?.traceId ?? createCorrelationId(),
      spanId: createCorrelationId().slice(0, 16),
      parentSpanId: options.parentSpanId ?? correlation?.spanId,
      name,
      startTime: Date.now(),
      attributes: options.attributes,
    };
    this.spans.push(span);
    return span;
  }

  endSpan(span: TraceSpan): TraceSpan {
    span.endTime = Date.now();
    return span;
  }

  listSpans(): TraceSpan[] {
    return [...this.spans];
  }
}

export class AlertManager {
  private readonly alerts: AlertEvent[] = [];

  fire(name: string, severity: AlertSeverity, message: string, labels?: MetricLabels): AlertEvent {
    const event: AlertEvent = {
      id: createCorrelationId(),
      name,
      severity,
      message,
      firedAt: new Date(),
      labels,
    };
    this.alerts.push(event);
    return event;
  }

  list(): AlertEvent[] {
    return [...this.alerts];
  }
}

export class ErrorMonitor {
  private readonly errors: ErrorEvent[] = [];

  capture(error: Error | string, extras?: Record<string, unknown>): ErrorEvent {
    const correlation = getCorrelation();
    const event: ErrorEvent = {
      id: createCorrelationId(),
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'string' ? undefined : error.stack,
      capturedAt: new Date(),
      correlationId: correlation?.correlationId,
      traceId: correlation?.traceId,
      extras,
    };
    this.errors.push(event);
    return event;
  }

  list(): ErrorEvent[] {
    return [...this.errors];
  }
}

export class ObservabilityService {
  readonly logger: StructuredLogger;
  readonly metrics: MetricsRegistry;
  readonly tracer: Tracer;
  readonly alerts: AlertManager;
  readonly errors: ErrorMonitor;

  constructor(
    options: {
      logger?: StructuredLogger;
      metrics?: MetricsRegistry;
      tracer?: Tracer;
      alerts?: AlertManager;
      errors?: ErrorMonitor;
    } = {},
  ) {
    this.logger = options.logger ?? new ConsoleStructuredLogger();
    this.metrics = options.metrics ?? new MetricsRegistry();
    this.tracer = options.tracer ?? new Tracer();
    this.alerts = options.alerts ?? new AlertManager();
    this.errors = options.errors ?? new ErrorMonitor();
  }

  withRequestContext<T>(
    fn: () => T,
    options: { correlationId?: string; traceId?: string } = {},
  ): T {
    const correlationId = options.correlationId ?? createCorrelationId();
    const traceId = options.traceId ?? correlationId;
    return runWithCorrelation({ correlationId, traceId }, () => {
      this.logger.info('request.start', { correlationId, traceId });
      this.metrics.counter('http_requests_total', 'Total HTTP requests');
      return fn();
    });
  }
}

export function createObservabilityService(
  options?: ConstructorParameters<typeof ObservabilityService>[0],
): ObservabilityService {
  return new ObservabilityService(options);
}
