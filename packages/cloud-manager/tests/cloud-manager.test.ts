import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSystem } from '@mycli/filesystem';
import { afterEach, describe, expect, it } from 'vitest';
import { createCloudManager } from '../src/index.js';
import { featureTemplatesRoot, mockExecutor } from './helpers.js';

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('CloudManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('generates cloud deploy documentation', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-cloud-docs-'));
    const fs = createFileSystem(dir);
    const cloud = createCloudManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    const result = await cloud.setupDocs({ provider: 'railway', appName: 'shop' });
    expect(result.files).toContain('DEPLOY.md');
    expect(result.files).toContain('.env.production.example');
    expect(result.files).toContain('deploy/secrets.railway.md');

    const deploy = await readFile(join(dir, 'DEPLOY.md'), 'utf8');
    expect(deploy).toContain('my deploy push');
    expect(deploy).toContain('railway');
  });

  it('plans railway push with dry-run executor', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-cloud-push-'));
    await createFileSystem(dir).write('railway.json', '{}');

    const cloud = createCloudManager({
      cwd: dir,
      executor: mockExecutor,
    });

    const result = await cloud.push({
      provider: 'railway',
      appName: 'shop',
      dryRun: true,
    });

    expect(result.success).toBe(true);
    expect(result.commands).toContain('railway up --detach');
  });

  it('validates missing deployment files', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-cloud-val-'));
    const cloud = createCloudManager({
      cwd: dir,
      executor: mockExecutor,
    });

    const result = await cloud.validate('fly', dir);
    expect(result.ready).toBe(false);
    expect(result.missingFiles).toContain('fly.toml');
  });

  it('supports dry-run docs', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-cloud-dry-'));
    const cloud = createCloudManager({
      cwd: dir,
      filesystem: createFileSystem(dir),
      templatesRoot: featureTemplatesRoot(),
    });

    await cloud.setupDocs({ provider: 'fly', appName: 'dry', dryRun: true });
    expect(await fileExists(join(dir, 'DEPLOY.md'))).toBe(false);
  });

  it('fetches vercel logs via executor', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-cloud-logs-'));
    const cloud = createCloudManager({
      cwd: dir,
      executor: mockExecutor,
    });

    const result = await cloud.logs({ provider: 'vercel', appName: 'shop', lines: 10 });
    expect(result.lines.join('\n')).toContain('vercel logs shop');
  });

  it('executes fly destroy via executor', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-cloud-destroy-'));
    const cloud = createCloudManager({
      cwd: dir,
      executor: mockExecutor,
    });

    const result = await cloud.destroy({ provider: 'fly', appName: 'shop', dryRun: false });
    expect(result.success).toBe(true);
    expect(result.commands[0]).toContain('fly apps destroy shop');
  });

  it('plans vercel rollback with dry-run', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-cloud-rollback-'));
    const cloud = createCloudManager({
      cwd: dir,
      executor: mockExecutor,
    });

    const result = await cloud.rollback({ provider: 'vercel', appName: 'shop', dryRun: true });
    expect(result.success).toBe(true);
    expect(result.commands).toContain('vercel rollback --yes');
  });
});
