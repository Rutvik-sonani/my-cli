import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createCli } from '../src/cli.js';

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('my add observability (Phase 11)', () => {
  let dir: string;
  let previousCwd: string;

  beforeEach(() => {
    previousCwd = process.cwd();
  });

  afterEach(async () => {
    process.chdir(previousCwd);
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  async function scaffoldProject() {
    dir = await mkdtemp(join(tmpdir(), 'mycli-obs-'));
    process.chdir(dir);
    await writeFile(
      join(dir, '.myclirc.json'),
      JSON.stringify({
        version: '1.0.0',
        projectName: 'demo',
        language: 'typescript',
        paths: { observability: 'src/observability' },
      }),
    );
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'demo', version: '1.0.0', type: 'module' }),
    );
  }

  it('adds pino observability with metrics tracing alerts errors', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run(['add', 'observability', '--logger', 'pino']);
    expect(result.exitCode).toBe(0);

    expect(await pathExists(join(dir, 'src/observability/logging/logger.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/observability/metrics/metrics.registry.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/observability/tracing/tracer.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/observability/alerts/alert.manager.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/observability/errors/sentry.monitor.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'OBSERVABILITY.md'))).toBe(true);

    const logger = await readFile(join(dir, 'src/observability/logging/logger.ts'), 'utf8');
    expect(logger).toContain('pino');
    expect(logger).toContain('correlationId');
    expect(logger).toContain('traceId');

    const metrics = await readFile(join(dir, 'src/observability/metrics/prometheus.ts'), 'utf8');
    expect(metrics).toContain('recordHttpRequest');
    expect(metrics).toContain('recordBusinessEvent');

    const config = JSON.parse(await readFile(join(dir, '.myclirc.json'), 'utf8'));
    expect(config.features.observability).toBe(true);
    expect(config.extensions.observabilityLogger).toBe('pino');
    expect(config.paths.observability).toBe('src/observability');

    const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
    expect(pkg.dependencies.pino).toBeTruthy();
    expect(pkg.dependencies['@sentry/node']).toBeTruthy();

    await cli.shutdown();
  });

  it('adds winston observability stack', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run(['add', 'observability', '--logger', 'winston']);
    expect(result.exitCode).toBe(0);

    const logger = await readFile(join(dir, 'src/observability/logging/logger.ts'), 'utf8');
    expect(logger).toContain('winston');
    const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
    expect(pkg.dependencies.winston).toBeTruthy();

    await cli.shutdown();
  });
});
