import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSystem } from '@mycli/filesystem';
import { afterEach, describe, expect, it } from 'vitest';
import { createTestingManager } from '../src/index.js';
import { featureTemplatesRoot } from './helpers.js';

describe('TestingManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('generates vitest config with supertest integration test', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-test-vitest-'));
    const fs = createFileSystem(dir);
    const testing = createTestingManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    const result = await testing.setup({ unit: 'vitest', e2e: 'none', integration: true });
    expect(result.devDependencies.vitest).toBeDefined();
    expect(result.devDependencies.supertest).toBeDefined();

    const integration = await readFile(join(dir, 'tests/integration/health.test.ts'), 'utf8');
    expect(integration).toContain('supertest');
  });

  it('generates jest config when selected', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-test-jest-'));
    const fs = createFileSystem(dir);
    const testing = createTestingManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    const result = await testing.setup({ unit: 'jest', e2e: 'none' });
    expect(result.devDependencies.jest).toBeDefined();
    expect(await fs.exists('jest.config.ts')).toBe(true);

    const unit = await readFile(join(dir, 'tests/unit/example.test.ts'), 'utf8');
    expect(unit).toContain('@jest/globals');
  });

  it('generates playwright e2e scaffold', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-test-e2e-'));
    const fs = createFileSystem(dir);
    const testing = createTestingManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    const result = await testing.setup({ unit: 'vitest', e2e: 'playwright' });
    expect(result.devDependencies['@playwright/test']).toBeDefined();
    expect(await fs.exists('playwright.config.ts')).toBe(true);
    expect(await fs.exists('tests/e2e/health.spec.ts')).toBe(true);
  });
});
