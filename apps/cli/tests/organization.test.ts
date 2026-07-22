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

describe('my organization setup (Phase 14)', () => {
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
    dir = await mkdtemp(join(tmpdir(), 'mycli-org-'));
    process.chdir(dir);
    await writeFile(
      join(dir, '.myclirc.json'),
      JSON.stringify({
        version: '1.0.0',
        projectName: 'demo',
        language: 'typescript',
        paths: { organizations: 'src/organizations' },
      }),
    );
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'demo', version: '1.0.0', type: 'module' }),
    );
  }

  it('sets up organization platform with all services', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run(['organization', 'setup']);
    expect(result.exitCode).toBe(0);

    expect(await pathExists(join(dir, 'src/organizations/services/organization.service.ts'))).toBe(
      true,
    );
    expect(await pathExists(join(dir, 'src/organizations/services/team.service.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/organizations/services/member.service.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/organizations/services/permission.service.ts'))).toBe(
      true,
    );
    expect(await pathExists(join(dir, 'src/organizations/services/project.service.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/organizations/organization.platform.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'ORGANIZATION.md'))).toBe(true);

    const member = await readFile(
      join(dir, 'src/organizations/services/member.service.ts'),
      'utf8',
    );
    expect(member).toContain('setRole');
    expect(member).toContain('assignTeam');

    const config = JSON.parse(await readFile(join(dir, '.myclirc.json'), 'utf8'));
    expect(config.features.organization).toBe(true);
    expect(config.paths.organizations).toBe('src/organizations');

    await cli.shutdown();
  });

  it('supports dry-run setup', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run(['organization', 'setup', '--dry-run']);
    expect(result.exitCode).toBe(0);
    expect(await pathExists(join(dir, 'src/organizations/services/organization.service.ts'))).toBe(
      false,
    );
    await cli.shutdown();
  });
});
