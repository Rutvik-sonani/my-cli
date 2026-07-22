import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createConfigManager } from '@mycli-cli/config-manager';
import type { ApplicationContext } from '@mycli-cli/core';
import { createFileSystem } from '@mycli-cli/filesystem';
import type { GeneratorContext } from '@mycli-cli/generator-engine';
import { createTemplateEngine } from '@mycli-cli/template-engine';
import { afterEach, describe, expect, it } from 'vitest';
import { createDomainGenerator } from '../src/generator.js';
import { resolveDomainEntityPaths } from '../src/paths.js';

const REPO_TEMPLATES = join(import.meta.dirname, '..', '..', '..', 'apps', 'cli', 'templates');

describe('DomainEngine', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('resolves DDD paths from config', () => {
    const paths = resolveDomainEntityPaths('user', {
      domain: 'src/domain',
      application: 'src/application',
      infrastructure: 'src/infrastructure/database',
    });
    expect(paths.entities).toContain('src/domain/user/entities');
    expect(paths.commands).toContain('src/application/commands');
  });

  it('generates full domain module without ORM imports in domain layer', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-domain-'));
    const fs = createFileSystem(dir);
    const templates = createTemplateEngine({ filesystem: fs, templatesRoot: REPO_TEMPLATES });
    const config = createConfigManager({ cwd: dir, filesystem: fs });
    await config.load();
    config.mergeIn({
      paths: {
        domain: 'src/domain',
        application: 'src/application',
        infrastructure: 'src/infrastructure/database',
      },
      language: 'typescript',
    });

    const generator = createDomainGenerator();
    const ctx: GeneratorContext = {
      app: { cwd: dir } as ApplicationContext,
      config,
      fs,
      templates,
      name: 'user',
      options: {},
      dryRun: false,
    };

    const result = await generator.run(ctx);
    expect(result.files.length).toBeGreaterThan(8);

    const entity = await readFile(join(dir, 'src/domain/user/entities/User.ts'), 'utf8');
    expect(entity).toContain('class User');
    expect(entity).not.toMatch(/prisma|fastify|express|drizzle/i);

    const aggregate = await readFile(
      join(dir, 'src/domain/user/aggregates/UserAggregate.ts'),
      'utf8',
    );
    expect(aggregate).toContain('UserAggregate');

    const event = await readFile(join(dir, 'src/domain/user/events/UserCreated.ts'), 'utf8');
    expect(event).toContain('UserCreated');

    const repo = await readFile(
      join(dir, 'src/infrastructure/database/repositories/UserRepository.ts'),
      'utf8',
    );
    expect(repo).toContain('UserRepository');

    const command = await readFile(
      join(dir, 'src/application/commands/CreateUserCommand.ts'),
      'utf8',
    );
    expect(command).toContain('CreateUserHandler');
  });
});
