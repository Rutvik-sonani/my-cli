import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createArchitectureEngine,
  listEnterpriseArchitectureStyles,
  mvcProvider,
} from '../src/index.js';

const REPO_TEMPLATES = join(import.meta.dirname, '..', '..', '..', 'apps', 'cli', 'templates');

describe('ArchitectureEngine', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('lists six enterprise architecture styles', () => {
    const styles = listEnterpriseArchitectureStyles();
    expect(styles).toHaveLength(6);
    expect(styles.map((s) => s.style)).toEqual([
      'mvc',
      'modular-monolith',
      'clean-architecture',
      'hexagonal',
      'domain-driven-design',
      'microservice',
    ]);
  });

  it('normalizes architecture style aliases', () => {
    const engine = createArchitectureEngine({ templatesRoot: REPO_TEMPLATES });
    expect(engine.normalizeStyle('ddd')).toBe('domain-driven-design');
    expect(engine.normalizeStyle('clean')).toBe('clean-architecture');
    expect(engine.normalizeStyle('hexagonal')).toBe('hexagonal');
  });

  it('generates MVC structure with dependency rules', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-arch-mvc-'));
    const engine = createArchitectureEngine({ cwd: dir, templatesRoot: REPO_TEMPLATES });
    const result = await engine.setup({
      cwd: dir,
      style: 'mvc',
      appName: 'shop',
      backend: 'fastify',
      language: 'typescript',
    });

    expect(result.style).toBe('mvc');
    expect(result.modulePaths.controllers).toBe('src/controllers');
    expect(result.dependencyRules.length).toBeGreaterThan(0);
    expect(result.files).toContain('ARCHITECTURE.md');
    expect(result.files).toContain('.architecture/dependency-rules.json');
    expect(result.files).toContain('src/controllers/README.md');

    const rules = JSON.parse(
      await readFile(join(dir, '.architecture/dependency-rules.json'), 'utf8'),
    );
    expect(rules.style).toBe('mvc');
    expect(rules.rules.length).toBe(mvcProvider.getDependencyRules().length);
  });

  it('generates DDD layered folders', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-arch-ddd-'));
    const engine = createArchitectureEngine({ cwd: dir, templatesRoot: REPO_TEMPLATES });
    const result = await engine.setup({
      cwd: dir,
      style: 'domain-driven-design',
      appName: 'platform',
    });

    expect(result.modulePaths.domain).toBe('src/domain');
    expect(result.files).toContain('src/domain/entities/README.md');
    expect(result.files).toContain('src/domain/value-objects/README.md');
    expect(result.files).toContain('src/infrastructure/database/repositories/README.md');
  });

  it('generates clean architecture composition root', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-arch-clean-'));
    const engine = createArchitectureEngine({ cwd: dir, templatesRoot: REPO_TEMPLATES });
    const result = await engine.setup({
      cwd: dir,
      style: 'clean-architecture',
      appName: 'api',
    });

    expect(result.files).toContain('src/composition-root.ts');
    expect(result.files).toContain('src/domain/entities/README.md');
    expect(result.files).toContain('.architecture/MODULE_BOUNDARIES.md');
  });

  it('generates microservice layout', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-arch-ms-'));
    const engine = createArchitectureEngine({ cwd: dir, templatesRoot: REPO_TEMPLATES });
    const result = await engine.setup({
      cwd: dir,
      style: 'microservice',
      appName: 'orders',
    });

    expect(result.modulePaths.modules).toBe('services');
    expect(result.files).toContain('services/api-gateway/README.md');
    expect(result.files).toContain('docker-compose.services.yml');
  });

  it('delegates legacy monorepo to architecture-manager', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-arch-legacy-'));
    const engine = createArchitectureEngine({ cwd: dir, templatesRoot: REPO_TEMPLATES });
    const result = await engine.setup({
      cwd: dir,
      style: 'monorepo',
      appName: 'workspace',
    });

    expect(result.files).toContain('pnpm-workspace.yaml');
    expect(result.dependencyRules).toEqual([]);
  });
});
