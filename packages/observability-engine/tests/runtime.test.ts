import { describe, expect, it } from 'vitest';
import { normalizeObservabilityLogger } from '../src/config.js';
import {
  AlertManager,
  ConsoleStructuredLogger,
  ErrorMonitor,
  MetricsRegistry,
  ObservabilityService,
  Tracer,
  createCorrelationId,
  createObservabilityService,
  getCorrelation,
} from '../src/runtime/observability-service.js';

describe('ObservabilityService', () => {
  it('propagates correlation ids into logs', () => {
    const logger = new ConsoleStructuredLogger();
    const service = createObservabilityService({ logger });
    const correlationId = createCorrelationId();

    service.withRequestContext(
      () => {
        expect(getCorrelation()?.correlationId).toBe(correlationId);
        logger.info('hello');
      },
      { correlationId },
    );

    expect(logger.getSink()[0]?.context.correlationId).toBe(correlationId);
    expect(logger.getSink()[0]?.context.traceId).toBe(correlationId);
  });

  it('exposes prometheus metrics text', () => {
    const metrics = new MetricsRegistry();
    metrics.counter('http_requests_total', 'Total HTTP requests', { route: '/health' });
    metrics.observe('http_request_duration_ms', 'Request duration', 12.5, { route: '/health' });
    const text = metrics.scrape();
    expect(text).toContain('# TYPE http_requests_total counter');
    expect(text).toContain('http_requests_total{route=/health} 1');
    expect(text).toContain('http_request_duration_ms_sum{route=/health} 12.5');
  });

  it('tracks nested spans for service dependencies', () => {
    const tracer = new Tracer();
    const parent = tracer.startSpan('api');
    const child = tracer.startSpan('db', { traceId: parent.traceId, parentSpanId: parent.spanId });
    tracer.endSpan(child);
    tracer.endSpan(parent);
    expect(tracer.listSpans()).toHaveLength(2);
    expect(child.parentSpanId).toBe(parent.spanId);
  });

  it('fires alerts and captures errors', () => {
    const alerts = new AlertManager();
    const errors = new ErrorMonitor();
    alerts.fire('latency', 'warning', 'p99 high');
    errors.capture(new Error('fail'));
    expect(alerts.list()).toHaveLength(1);
    expect(errors.list()[0]?.message).toBe('fail');
  });

  it('runs full service composition', () => {
    const service = new ObservabilityService();
    service.withRequestContext(() => {
      service.metrics.counter('business_events_total', 'events', { event: 'signup' });
      const span = service.tracer.startSpan('signup');
      service.tracer.endSpan(span);
      service.alerts.fire('signup-spike', 'info', 'spike detected');
    });
    expect(service.metrics.scrape()).toContain('business_events_total');
  });
});

describe('config', () => {
  it('normalizes logger ids', () => {
    expect(normalizeObservabilityLogger('pino')).toBe('pino');
    expect(normalizeObservabilityLogger('winston')).toBe('winston');
    expect(normalizeObservabilityLogger('bunyan')).toBeNull();
  });
});
