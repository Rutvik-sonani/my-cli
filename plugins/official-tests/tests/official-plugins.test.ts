import { readFile } from 'node:fs/promises';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createConfigManager } from '@mycli/config-manager';
import { ApplicationContext } from '@mycli/core';
import { createFileSystem } from '@mycli/filesystem';
import { createPluginManager } from '@mycli/plugin-system';
import { afterEach, describe, expect, it } from 'vitest';
import { scaffoldProject } from './helpers.js';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');

const OFFICIAL_SLUGS = [
  'ai',
  'auth',
  'aws',
  'azure',
  'cockroachdb',
  'docker',
  'fly',
  'gcp',
  'github',
  'kubernetes',
  'mariadb',
  'mongodb',
  'mysql',
  'postgres',
  'prisma',
  'railway',
  'rbac',
  'redis',
  'sqlite',
  'sqlserver',
  'swagger',
] as const;

const PLUGIN_NAMES: Record<(typeof OFFICIAL_SLUGS)[number], string> = {
  ai: '@mycli/ai',
  auth: '@mycli/auth',
  aws: '@mycli/aws',
  azure: '@mycli/azure',
  cockroachdb: '@mycli/cockroachdb',
  docker: '@mycli/docker',
  fly: '@mycli/fly',
  gcp: '@mycli/gcp',
  github: '@mycli/github',
  kubernetes: '@mycli/kubernetes',
  mariadb: '@mycli/mariadb',
  mongodb: '@mycli/mongodb',
  mysql: '@mycli/mysql',
  postgres: '@mycli/postgres',
  prisma: '@mycli/prisma',
  railway: '@mycli/railway',
  rbac: '@mycli/rbac',
  redis: '@mycli/redis',
  sqlite: '@mycli/sqlite',
  sqlserver: '@mycli/sqlserver',
  swagger: '@mycli/swagger',
};

describe('official plugins', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  for (const slug of OFFICIAL_SLUGS) {
    it(`installs @mycli/${slug} from official path`, async () => {
      dir = await mkdtemp(join(tmpdir(), `mycli-plugin-${slug}-`));
      await scaffoldProject(dir, slug);

      const app = new ApplicationContext({ cwd: dir, interactive: false });
      const config = createConfigManager({ cwd: dir, filesystem: createFileSystem(dir) });
      await config.load();

      const plugins = createPluginManager({ app, config, filesystem: createFileSystem(dir) });
      const pluginPath = join(REPO_ROOT, 'plugins', 'official', slug);
      const pluginName = PLUGIN_NAMES[slug];

      const loaded = await plugins.install(pluginName, { path: pluginPath });
      expect(loaded.plugin.name).toBe(pluginName);
      expect(loaded.plugin.version).toBe('1.0.0');

      const manifest = JSON.parse(await readFile(join(pluginPath, 'plugin.json'), 'utf8')) as {
        slug: string;
      };
      expect(manifest.slug).toBe(slug);
    });
  }
});
