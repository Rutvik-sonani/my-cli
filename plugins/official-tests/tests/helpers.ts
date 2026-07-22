import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createFileSystem } from '@mycli-cli/filesystem';

const DB_PLUGIN_DATABASE: Record<string, string> = {
  postgres: 'postgresql',
  mysql: 'mysql',
  mariadb: 'mariadb',
  mongodb: 'mongodb',
  sqlite: 'sqlite',
  redis: 'redis',
  sqlserver: 'sqlserver',
  cockroachdb: 'cockroachdb',
};

export async function scaffoldProject(dir: string, slug: string): Promise<void> {
  const fs = createFileSystem(dir);
  const database = DB_PLUGIN_DATABASE[slug];
  const baseConfig: Record<string, unknown> = {
    version: '1.0.0',
    projectName: 'demo',
    language: 'typescript',
    backend: 'fastify',
    orm: 'prisma',
    database: database ?? 'postgresql',
    paths: { modules: 'src/modules' },
    features: slug === 'rbac' ? { auth: true } : {},
  };

  await fs.writeJson('.myclirc.json', baseConfig);
  await fs.writeJson('package.json', {
    name: 'demo',
    version: '1.0.0',
    type: 'module',
    scripts: { test: 'vitest run', build: 'tsc' },
  });

  await mkdir(join(dir, 'src'), { recursive: true });
  await writeFile(join(dir, 'src/index.ts'), 'export {};\n');

  if (database || slug === 'prisma' || slug === 'auth' || slug === 'rbac') {
    await mkdir(join(dir, 'prisma'), { recursive: true });
    await writeFile(
      join(dir, 'prisma/schema.prisma'),
      'generator client { provider = "prisma-client-js" }\n',
    );
  }

  if (slug === 'swagger') {
    await mkdir(join(dir, 'src/routes'), { recursive: true });
    await writeFile(
      join(dir, 'src/routes/features.ts'),
      `export async function registerFeatureRoutes(): Promise<void> {
  // <mycli:features>
  // </mycli:features>
}
`,
    );
  }
}
