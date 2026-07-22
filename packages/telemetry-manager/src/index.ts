import { randomUUID } from 'node:crypto';
import type { ConfigManager } from '@mycli-cli/config-manager';
import { type TelemetryTransport, createTelemetryTransport } from './transport.js';

export interface TelemetryEvent {
  name: string;
  properties?: Record<string, string | number | boolean>;
  timestamp?: string;
}

export interface TelemetryPayload {
  anonymousId: string;
  cliVersion: string;
  os: string;
  nodeVersion: string;
  event: TelemetryEvent;
}

/**
 * Telemetry is disabled by default and opt-in only.
 * Never collects project code, file names, secrets, or environment variables.
 */
export class TelemetryManager {
  private enabled: boolean;
  private anonymousId: string;
  private readonly cliVersion: string;
  private readonly queue: TelemetryEvent[] = [];
  private readonly transport: TelemetryTransport;

  constructor(
    options: {
      config?: ConfigManager;
      cliVersion?: string;
      enabled?: boolean;
      transport?: TelemetryTransport;
    } = {},
  ) {
    const telemetry = options.config?.get().telemetry;
    this.enabled = options.enabled ?? telemetry?.enabled ?? false;
    this.anonymousId = telemetry?.anonymousId ?? randomUUID();
    this.cliVersion = options.cliVersion ?? '1.0.0';
    this.transport = options.transport ?? createTelemetryTransport();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async enable(config?: ConfigManager): Promise<void> {
    this.enabled = true;
    if (config) {
      config.mergeIn({ telemetry: { enabled: true, anonymousId: this.anonymousId } });
      await config.save();
    }
  }

  async disable(config?: ConfigManager): Promise<void> {
    this.enabled = false;
    if (config) {
      config.mergeIn({ telemetry: { enabled: false, anonymousId: this.anonymousId } });
      await config.save();
    }
  }

  track(name: string, properties: TelemetryEvent['properties'] = {}): void {
    if (!this.enabled) {
      return;
    }
    const safe: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(properties)) {
      if (/secret|password|token|key|env|path|file/i.test(key)) {
        continue;
      }
      safe[key] = value;
    }
    this.queue.push({ name, properties: safe, timestamp: new Date().toISOString() });
  }

  buildPayload(event: TelemetryEvent): TelemetryPayload {
    return {
      anonymousId: this.anonymousId,
      cliVersion: this.cliVersion,
      os: process.platform,
      nodeVersion: process.version,
      event,
    };
  }

  drain(): TelemetryEvent[] {
    return this.queue.splice(0, this.queue.length);
  }

  async flush(): Promise<{ sent: number; skipped: boolean; reason?: string }> {
    if (!this.enabled) {
      this.queue.length = 0;
      return { sent: 0, skipped: true, reason: 'disabled' };
    }

    const events = this.drain();
    if (events.length === 0) {
      return { sent: 0, skipped: true, reason: 'empty-queue' };
    }

    const payloads = events.map((event) => this.buildPayload(event));
    return this.transport.sendBatch(payloads);
  }
}

export function createTelemetryManager(options?: {
  config?: ConfigManager;
  cliVersion?: string;
  enabled?: boolean;
  transport?: TelemetryTransport;
}): TelemetryManager {
  return new TelemetryManager(options);
}

export { createTelemetryTransport, TelemetryTransport } from './transport.js';
export type { TelemetryFlushResult, TelemetryTransportOptions } from './transport.js';
