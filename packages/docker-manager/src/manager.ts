import { join } from 'node:path';
import { type FileSystem, createFileSystem } from '@mycli/filesystem';
import { type TemplateEngine, createTemplateEngine } from '@mycli/template-engine';
import type { DockerGenerateOptions, DockerGenerateResult } from './types.js';

/**
 * Generates Docker, Compose, and related container configuration via EJS templates.
 */
export class DockerManager {
  private readonly fs: FileSystem;
  private readonly templates: TemplateEngine;

  constructor(
    options: {
      cwd?: string;
      filesystem?: FileSystem;
      templateEngine?: TemplateEngine;
      templatesRoot?: string;
    } = {},
  ) {
    const cwd = options.cwd ?? process.cwd();
    this.fs = options.filesystem ?? createFileSystem(cwd);
    this.templates =
      options.templateEngine ??
      createTemplateEngine({
        filesystem: this.fs,
        templatesRoot: options.templatesRoot ?? 'templates',
      });
  }

  async generate(options: DockerGenerateOptions): Promise<DockerGenerateResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const data = {
      appName: options.appName,
      nodeVersion: options.nodeVersion ?? '22',
      port: options.port ?? 3000,
      database: options.database ?? 'none',
      redis: options.redis ?? false,
      mailhog: options.mailhog ?? false,
      nginx: options.nginx ?? false,
      environment: options.environment ?? 'development',
    };
    const templateData = data as unknown as Record<string, unknown>;
    const written: string[] = [];

    const files = [
      { template: 'features/docker/Dockerfile.ejs', out: 'Dockerfile' },
      { template: 'features/docker/dockerignore.ejs', out: '.dockerignore' },
      { template: 'features/docker/docker-compose.yml.ejs', out: 'docker-compose.yml' },
      { template: 'features/docker/docker-compose.prod.yml.ejs', out: 'docker-compose.prod.yml' },
      { template: 'features/docker/docker-compose.test.yml.ejs', out: 'docker-compose.test.yml' },
      { template: 'features/docker/DOCKER.md.ejs', out: 'DOCKER.md' },
    ];

    for (const file of files) {
      const content = await this.templates.renderFile(file.template, { data: templateData });
      if (!options.dryRun) {
        await fs.write(file.out, content);
      }
      written.push(file.out);
    }

    if (options.nginx) {
      const nginxPath = join('docker', 'nginx', 'default.conf');
      const content = await this.templates.renderFile('features/docker/nginx/default.conf.ejs', {
        data: templateData,
      });
      if (!options.dryRun) {
        await fs.write(nginxPath, content);
      }
      written.push(nginxPath);
    }

    return { files: written };
  }
}

export function createDockerManager(options?: {
  cwd?: string;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
}): DockerManager {
  return new DockerManager(options);
}

export type {
  DockerGenerateOptions,
  DockerGenerateResult,
  DockerEnvironment,
  DockerDatabase,
} from './types.js';
