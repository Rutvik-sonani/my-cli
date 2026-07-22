import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createCli } from '../src/cli.js';

describe('my architecture command', () => {
  let dir: string;
  let previousCwd: string;

  beforeEach(() => {
    previousCwd = process.cwd();
  });

  afterEach(async () => {
    try {
      process.chdir(previousCwd);
    } catch {
      // temp dir may already be removed
    }
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('my architecture list runs', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-arch-cmd-'));
    process.chdir(dir);
    const cli = await createCli();
    const result = await cli.run(['architecture', 'list']);
    expect(result.exitCode).toBe(0);
    await cli.shutdown();
  });
});

describe('my make domain', () => {
  let dir: string;
  let previousCwd: string;

  beforeEach(() => {
    previousCwd = process.cwd();
  });

  afterEach(async () => {
    try {
      process.chdir(previousCwd);
    } catch {
      // ignore
    }
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('generates DDD domain module', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-make-domain-'));
    process.chdir(dir);
    await writeFile(
      join(dir, '.myclirc.json'),
      JSON.stringify({
        version: '1.0.0',
        projectName: 'demo',
        language: 'typescript',
        architectureStyle: 'domain-driven-design',
        paths: {
          domain: 'src/domain',
          application: 'src/application',
          infrastructure: 'src/infrastructure/database',
        },
      }),
    );
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'demo', version: '1.0.0', type: 'module' }),
    );

    const cli = await createCli();
    const result = await cli.run(['make', 'domain', 'user']);
    expect(result.exitCode).toBe(0);

    const entity = await readFile(join(dir, 'src/domain/user/entities/User.ts'), 'utf8');
    expect(entity).toContain('class User');
    const testFile = await readFile(join(dir, 'src/domain/user/tests/user.domain.test.ts'), 'utf8');
    expect(testFile).toContain('UserAggregate');

    await cli.shutdown();
  });
});
