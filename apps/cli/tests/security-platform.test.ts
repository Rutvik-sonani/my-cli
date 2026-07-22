import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createCli } from '../src/cli.js';

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('my security setup + scan (Phase 12)', () => {
  let dir: string;
  let previousCwd: string;

  beforeEach(() => {
    previousCwd = process.cwd();
  });

  afterEach(async () => {
    process.chdir(previousCwd);
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  async function scaffoldProject() {
    dir = await mkdtemp(join(tmpdir(), 'mycli-sec-'));
    process.chdir(dir);
    await writeFile(
      join(dir, '.myclirc.json'),
      JSON.stringify({
        version: '1.0.0',
        projectName: 'demo',
        language: 'typescript',
        paths: { security: 'src/security' },
      }),
    );
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'demo', version: '1.0.0', type: 'module' }),
    );
  }

  it('sets up enterprise security modules via my security setup', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run(['security', 'setup']);
    expect(result.exitCode).toBe(0);

    expect(await pathExists(join(dir, 'src/security/headers/security-headers.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/security/cors/cors.config.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/security/csrf/csrf.protection.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/security/rate-limit/rate-limiter.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/security/sanitization/sanitize.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/security/validation/validate.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'SECURITY.md'))).toBe(true);

    const config = JSON.parse(await readFile(join(dir, '.myclirc.json'), 'utf8'));
    expect(config.features.security).toBe(true);
    expect(config.paths.security).toBe('src/security');

    const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
    expect(pkg.dependencies['@fastify/helmet']).toBeTruthy();

    await cli.shutdown();
  });

  it('adds security via my add security and scans to security-report.md', async () => {
    await scaffoldProject();
    const cli = await createCli();

    const addResult = await cli.run(['add', 'security']);
    expect(addResult.exitCode).toBe(0);
    expect(await pathExists(join(dir, 'src/security/security.plugin.ts'))).toBe(true);

    const scanResult = await cli.run(['security', 'scan']);
    expect(scanResult.exitCode).toBe(0);
    expect(await pathExists(join(dir, 'security-report.md'))).toBe(true);

    const report = await readFile(join(dir, 'security-report.md'), 'utf8');
    expect(report).toContain('# Security Report — demo');
    expect(report).toContain('## Findings');

    await cli.shutdown();
  });
});
