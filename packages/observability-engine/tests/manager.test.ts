import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSystem } from '@mycli-cli/filesystem';
import { createTemplateEngine } from '@mycli-cli/template-engine';
import { afterEach, describe, expect, it } from 'vitest';
import { createObservabilityManager } from '../src/manager.js';

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('ObservabilityManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('scaffolds pino observability platform', async () => {
    dir = await mkdtemp(join(tmpdir(), 'obs-engine-'));
    const fs = createFileSystem(dir);
    const templatesRoot = join(import.meta.dirname, '../../../apps/cli/templates');
    const manager = createObservabilityManager({
      cwd: dir,
      filesystem: fs,
      templateEngine: createTemplateEngine({ filesystem: fs, templatesRoot }),
      templatesRoot,
    });

    const result = await manager.setup({
      appName: 'demo',
      logger: 'pino',
      language: 'typescript',
    });

    expect(result.files.length).toBeGreaterThan(10);
    expect(result.dependencies.pino).toBeTruthy();
    expect(result.dependencies['prom-client']).toBeTruthy();
    expect(result.dependencies['@sentry/node']).toBeTruthy();

    expect(await pathExists(join(dir, 'src/observability/logging/logger.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/observability/metrics/prometheus.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/observability/tracing/otel.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/observability/alerts/alert.manager.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/observability/errors/sentry.monitor.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'tests/observability/observability.test.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'OBSERVABILITY.md'))).toBe(true);

    const logger = await readFile(join(dir, 'src/observability/logging/logger.ts'), 'utf8');
    expect(logger).toContain("from 'pino'");
    expect(logger).toContain('correlationId');
  });

  it('scaffolds winston logger variant', async () => {
    dir = await mkdtemp(join(tmpdir(), 'obs-winston-'));
    const fs = createFileSystem(dir);
    const templatesRoot = join(import.meta.dirname, '../../../apps/cli/templates');
    const manager = createObservabilityManager({
      cwd: dir,
      filesystem: fs,
      templateEngine: createTemplateEngine({ filesystem: fs, templatesRoot }),
      templatesRoot,
    });

    const result = await manager.setup({
      appName: 'corp',
      logger: 'winston',
      language: 'typescript',
    });

    expect(result.dependencies.winston).toBeTruthy();
    expect(result.dependencies.pino).toBeUndefined();
    const logger = await readFile(join(dir, 'src/observability/logging/logger.ts'), 'utf8');
    expect(logger).toContain("from 'winston'");
  });
});
