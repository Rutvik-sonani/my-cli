import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createDependencyManager } from '../src/index.js';

describe('DependencyManager', () => {
  it('detects pnpm from lockfile', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mycli-deps-'));
    await writeFile(join(dir, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
    const deps = createDependencyManager({ cwd: dir, preferred: 'pnpm' });
    const detected = await deps.detect();
    expect(detected.manager).toBe('pnpm');
    expect(detected.lockfile).toBe('pnpm-lock.yaml');
    await rm(dir, { recursive: true, force: true });
  });

  it('supports dry-run install', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mycli-deps-'));
    const deps = createDependencyManager({ cwd: dir, preferred: 'pnpm' });
    const result = await deps.install(['lodash'], { dryRun: true, packageManager: 'pnpm' });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('[dry-run]');
    await rm(dir, { recursive: true, force: true });
  });

  it('updates package.json via mutator', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mycli-deps-'));
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'demo', version: '1.0.0' }));
    const deps = createDependencyManager({ cwd: dir });
    await deps.updatePackageJson((pkg) => {
      pkg.dependencies = { fastify: '^5.0.0' };
      return pkg;
    });
    const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
    expect(pkg.dependencies.fastify).toBe('^5.0.0');
    await rm(dir, { recursive: true, force: true });
  });
});
