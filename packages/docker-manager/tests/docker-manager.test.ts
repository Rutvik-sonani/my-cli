import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSystem } from '@mycli-cli/filesystem';
import { afterEach, describe, expect, it } from 'vitest';
import { createDockerManager } from '../src/index.js';
import { featureTemplatesRoot } from './helpers.js';

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('DockerManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('generates Dockerfile, compose, and docs via EJS templates', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-docker-'));
    const fs = createFileSystem(dir);
    const docker = createDockerManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    const result = await docker.generate({
      appName: 'shop',
      database: 'postgres',
      redis: true,
      mailhog: true,
    });

    expect(result.files).toContain('Dockerfile');
    expect(result.files).toContain('docker-compose.yml');
    expect(result.files).toContain('docker-compose.test.yml');
    expect(result.files).toContain('DOCKER.md');

    const dockerfile = await readFile(join(dir, 'Dockerfile'), 'utf8');
    expect(dockerfile).toContain('FROM node:');
    expect(dockerfile).toContain('EXPOSE');

    const compose = await readFile(join(dir, 'docker-compose.yml'), 'utf8');
    expect(compose).toContain('shop');
    expect(compose).toContain('postgres');
    expect(compose).toContain('redis');

    const testCompose = await readFile(join(dir, 'docker-compose.test.yml'), 'utf8');
    expect(testCompose).toContain('NODE_ENV: test');
    expect(testCompose).toContain('npm test');
  });

  it('generates nginx config when nginx option enabled', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-docker-nginx-'));
    const fs = createFileSystem(dir);
    const docker = createDockerManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    const result = await docker.generate({
      appName: 'api',
      nginx: true,
    });

    expect(result.files).toContain('docker/nginx/default.conf');
    const nginx = await readFile(join(dir, 'docker/nginx/default.conf'), 'utf8');
    expect(nginx).toContain('proxy_pass');
  });

  it('supports dry-run without writing files', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-docker-dry-'));
    const fs = createFileSystem(dir);
    const docker = createDockerManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    const result = await docker.generate({ appName: 'dry', dryRun: true });
    expect(result.files.length).toBeGreaterThan(3);
    expect(await fileExists(join(dir, 'Dockerfile'))).toBe(false);
  });
});
