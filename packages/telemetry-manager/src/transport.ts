import type { TelemetryPayload } from './index.js';

export interface TelemetryTransportOptions {
  endpoint?: string;
  fetchImpl?: typeof fetch;
}

export interface TelemetryFlushResult {
  sent: number;
  skipped: boolean;
  reason?: string;
}

export class TelemetryTransport {
  private readonly endpoint?: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: TelemetryTransportOptions = {}) {
    this.endpoint = options.endpoint ?? process.env.MYCLI_TELEMETRY_URL;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  getEndpoint(): string | undefined {
    return this.endpoint;
  }

  async sendBatch(payloads: TelemetryPayload[]): Promise<TelemetryFlushResult> {
    if (payloads.length === 0) {
      return { sent: 0, skipped: true, reason: 'empty-queue' };
    }

    if (!this.endpoint) {
      return { sent: 0, skipped: true, reason: 'no-endpoint' };
    }

    const response = await this.fetchImpl(this.endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'mycli-telemetry',
      },
      body: JSON.stringify({ events: payloads }),
    });

    if (!response.ok) {
      throw new Error(`Telemetry transport failed (${response.status})`);
    }

    return { sent: payloads.length, skipped: false };
  }
}

export function createTelemetryTransport(options?: TelemetryTransportOptions): TelemetryTransport {
  return new TelemetryTransport(options);
}
