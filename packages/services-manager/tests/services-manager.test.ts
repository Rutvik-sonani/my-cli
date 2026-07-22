import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSystem } from '@mycli/filesystem';
import { afterEach, describe, expect, it } from 'vitest';
import { createServicesManager } from '../src/index.js';
import { featureTemplatesRoot } from './helpers.js';

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('ServicesManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('generates cache service files', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-svc-cache-'));
    const fs = createFileSystem(dir);
    const services = createServicesManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    const result = await services.setup({ service: 'cache', appName: 'shop' });

    expect(result.files).toContain('src/services/cache/cache.service.ts');
    expect(result.files).toContain('docs/cache.md');
    expect(result.dependencies.ioredis).toBeTruthy();

    const cache = await readFile(join(dir, 'src/services/cache/cache.service.ts'), 'utf8');
    expect(cache).toContain('CacheService');
  });

  it('generates memory and memcached cache providers', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-svc-cache-prov-'));
    const fs = createFileSystem(dir);
    const services = createServicesManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    const memory = await services.setup({ service: 'cache', appName: 'shop', provider: 'memory' });
    expect(memory.dependencies).toEqual({});
    const memorySrc = await readFile(join(dir, 'src/services/cache/cache.service.ts'), 'utf8');
    expect(memorySrc).toContain('Map');

    await rm(join(dir, 'src/services/cache'), { recursive: true, force: true });
    const memcached = await services.setup({
      service: 'cache',
      appName: 'shop',
      provider: 'memcached',
    });
    expect(memcached.dependencies.memcached).toBeTruthy();
    const memcachedSrc = await readFile(join(dir, 'src/services/cache/cache.service.ts'), 'utf8');
    expect(memcachedSrc).toContain('getMemcachedClient');
  });

  it('generates alternate queue providers', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-svc-queue-prov-'));
    const fs = createFileSystem(dir);
    const services = createServicesManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    const rabbit = await services.setup({
      service: 'queue',
      appName: 'shop',
      provider: 'rabbitmq',
    });
    expect(rabbit.dependencies.amqplib).toBeTruthy();
    let queueSrc = await readFile(join(dir, 'src/services/queue/queue.service.ts'), 'utf8');
    expect(queueSrc).toContain('rabbitmq');

    await rm(join(dir, 'src/services/queue'), { recursive: true, force: true });
    const kafka = await services.setup({ service: 'queue', appName: 'shop', provider: 'kafka' });
    expect(kafka.dependencies.kafkajs).toBeTruthy();
    queueSrc = await readFile(join(dir, 'src/services/queue/queue.service.ts'), 'utf8');
    expect(queueSrc).toContain('getKafkaProducer');

    await rm(join(dir, 'src/services/queue'), { recursive: true, force: true });
    const sqs = await services.setup({ service: 'queue', appName: 'shop', provider: 'sqs' });
    expect(sqs.dependencies['@aws-sdk/client-sqs']).toBeTruthy();
    queueSrc = await readFile(join(dir, 'src/services/queue/queue.service.ts'), 'utf8');
    expect(queueSrc).toContain('getSqsClient');
  });

  it('generates queue and events services', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-svc-queue-'));
    const fs = createFileSystem(dir);
    const services = createServicesManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    await services.setup({ service: 'queue', appName: 'shop' });
    await services.setup({ service: 'events', appName: 'shop' });

    expect(await fileExists(join(dir, 'src/services/queue/queue.service.ts'))).toBe(true);
    expect(await fileExists(join(dir, 'src/services/events/event-bus.service.ts'))).toBe(true);
    expect(await fileExists(join(dir, 'src/services/index.ts'))).toBe(true);
  });

  it('generates mail, storage, and payment services', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-svc-all-'));
    const fs = createFileSystem(dir);
    const services = createServicesManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    await services.setup({ service: 'mail', appName: 'shop', provider: 'smtp' });
    await services.setup({ service: 'storage', appName: 'shop', provider: 's3' });
    const payment = await services.setup({ service: 'payment', appName: 'shop' });

    expect(await fileExists(join(dir, 'src/services/mail/mail.service.ts'))).toBe(true);
    expect(await fileExists(join(dir, 'src/services/storage/storage.service.ts'))).toBe(true);
    expect(await fileExists(join(dir, 'src/services/payment/payment.routes.ts'))).toBe(true);
    expect(payment.dependencies.stripe).toBeTruthy();
  });

  it('supports dry-run', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-svc-dry-'));
    const fs = createFileSystem(dir);
    const services = createServicesManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    await services.setup({ service: 'cache', appName: 'dry', dryRun: true });
    expect(await fileExists(join(dir, 'src/services/cache/cache.service.ts'))).toBe(false);
  });
});
