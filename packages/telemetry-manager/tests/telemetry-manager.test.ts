import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createConfigManager } from '@mycli-cli/config-manager';
import { describe, expect, it, vi } from 'vitest';
import { createTelemetryManager } from '../src/index.js';

describe('TelemetryManager', () => {
  it('is disabled by default', () => {
    const telemetry = createTelemetryManager();
    expect(telemetry.isEnabled()).toBe(false);
    telemetry.track('create', { count: 1 });
    expect(telemetry.drain()).toEqual([]);
  });

  it('tracks events when enabled and filters sensitive keys', () => {
    const telemetry = createTelemetryManager({ enabled: true });
    telemetry.track('create', {
      count: 1,
      password: 'secret',
      token: 'abc',
      filePath: '/tmp/x',
    });
    const events = telemetry.drain();
    expect(events).toHaveLength(1);
    expect(events[0]?.properties).toEqual({ count: 1 });
  });

  it('persists opt-in via config manager', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mycli-tel-'));
    const config = createConfigManager({ cwd: dir });
    await config.load();

    const telemetry = createTelemetryManager({ config });
    await telemetry.enable(config);
    expect(telemetry.isEnabled()).toBe(true);
    expect(config.get().telemetry?.enabled).toBe(true);

    await rm(dir, { recursive: true, force: true });
  });

  it('builds anonymous payload', () => {
    const telemetry = createTelemetryManager({ enabled: true, cliVersion: '1.2.3' });
    const payload = telemetry.buildPayload({ name: 'ping' });
    expect(payload.cliVersion).toBe('1.2.3');
    expect(payload.event.name).toBe('ping');
    expect(payload.nodeVersion).toBeTruthy();
    expect(payload.os).toBeTruthy();
  });

  it('flush sends batch when endpoint is configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    const { createTelemetryTransport } = await import('../src/transport.js');
    const transport = createTelemetryTransport({
      endpoint: 'https://telemetry.test/events',
      fetchImpl: fetchMock as typeof fetch,
    });
    const telemetry = createTelemetryManager({ enabled: true, transport });
    telemetry.track('create', { count: 1 });
    const result = await telemetry.flush();
    expect(result.sent).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('flush skips when disabled or no endpoint', async () => {
    const telemetry = createTelemetryManager({ enabled: false });
    telemetry.track('create', { count: 1 });
    const disabled = await telemetry.flush();
    expect(disabled.skipped).toBe(true);

    const enabled = createTelemetryManager({ enabled: true });
    enabled.track('create', { count: 1 });
    const noEndpoint = await enabled.flush();
    expect(noEndpoint.skipped).toBe(true);
    expect(noEndpoint.reason).toBe('no-endpoint');
  });
});
