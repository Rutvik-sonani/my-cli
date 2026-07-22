import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildEslintArchitectureConfig } from '../src/eslint-config.js';
import { validateArchitectureBoundaries } from '../src/validate.js';

describe('architecture validate', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('passes when domain file has no forbidden imports', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-arch-val-'));
    await mkdir(join(dir, '.architecture'), { recursive: true });
    await writeFile(
      join(dir, '.architecture/dependency-rules.json'),
      JSON.stringify({
        version: '1.0.0',
        style: 'domain-driven-design',
        label: 'DDD',
        appName: 'test',
        generatedBy: 'test',
        rules: [
          {
            layer: 'Domain',
            path: 'src/domain',
            mayImport: ['src/domain'],
            mustNotImport: ['src/infrastructure', 'fastify'],
            description: 'Domain isolation',
          },
        ],
      }),
    );
    await mkdir(join(dir, 'src/domain/user'), { recursive: true });
    await writeFile(
      join(dir, 'src/domain/user/entity.ts'),
      `import { Email } from './email.js';\nexport class User {}\n`,
    );

    const result = await validateArchitectureBoundaries(dir);
    expect(result.ok).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('flags forbidden imports', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-arch-val-bad-'));
    await mkdir(join(dir, '.architecture'), { recursive: true });
    await writeFile(
      join(dir, '.architecture/dependency-rules.json'),
      JSON.stringify({
        version: '1.0.0',
        style: 'domain-driven-design',
        rules: [
          {
            layer: 'Domain',
            path: 'src/domain',
            mayImport: [],
            mustNotImport: ['src/infrastructure'],
            description: 'No infra in domain',
          },
        ],
      }),
    );
    await mkdir(join(dir, 'src/domain/user'), { recursive: true });
    await writeFile(
      join(dir, 'src/domain/user/bad.ts'),
      `import { X } from '../../infrastructure/db.js';\n`,
    );

    const result = await validateArchitectureBoundaries(dir);
    expect(result.ok).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it('builds eslint config from rules file', () => {
    const config = buildEslintArchitectureConfig({
      version: '1.0.0',
      style: 'mvc',
      label: 'MVC',
      appName: 'shop',
      generatedBy: 'test',
      rules: [
        {
          layer: 'Models',
          path: 'src/models',
          mayImport: [],
          mustNotImport: ['src/controllers'],
          description: 'Models are pure',
        },
      ],
    });
    expect(config.filename).toBe('eslint.architecture.config.js');
    expect(config.content).toContain('no-restricted-imports');
    expect(config.content).toContain('shop');
  });
});
