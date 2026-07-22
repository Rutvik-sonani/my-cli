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

describe('my add enterprise-auth (Phase 6)', () => {
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
    dir = await mkdtemp(join(tmpdir(), 'mycli-identity-'));
    process.chdir(dir);
    await writeFile(
      join(dir, '.myclirc.json'),
      JSON.stringify({
        version: '1.0.0',
        projectName: 'demo',
        language: 'typescript',
        paths: { identity: 'src/identity' },
      }),
    );
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'demo', version: '1.0.0', type: 'module' }),
    );
  }

  it('adds enterprise-auth with google oidc provider', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run(['add', 'enterprise-auth', '--providers', 'google']);
    expect(result.exitCode).toBe(0);

    expect(await pathExists(join(dir, 'src/identity/providers/google.provider.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/identity/strategies/oidc.strategy.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/identity/strategies/oauth2.strategy.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/identity/guards/identity.guard.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/identity/sessions/session.service.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'tests/identity/identity.test.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'ENTERPRISE_AUTH.md'))).toBe(true);

    const register = await readFile(join(dir, 'src/identity/register-identity.ts'), 'utf8');
    expect(register).toContain('GoogleIdentityProvider');

    const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
    expect(pkg.dependencies['openid-client']).toBeDefined();

    const config = JSON.parse(await readFile(join(dir, '.myclirc.json'), 'utf8'));
    expect(config.features['enterprise-auth']).toBe(true);
    expect(config.extensions.identityProviders).toEqual(['google']);

    await cli.shutdown();
  });

  it('adds saml and ldap providers with mixed dependencies', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run(['add', 'enterprise-auth', '--providers', 'saml,ldap,azure-ad']);
    expect(result.exitCode).toBe(0);

    expect(await pathExists(join(dir, 'src/identity/providers/saml.provider.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/identity/providers/ldap.provider.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/identity/providers/azure-ad.provider.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/identity/strategies/saml.strategy.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/identity/strategies/ldap.strategy.ts'))).toBe(true);

    const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
    expect(pkg.dependencies['@node-saml/node-saml']).toBeDefined();
    expect(pkg.dependencies.ldapts).toBeDefined();
    expect(pkg.dependencies['openid-client']).toBeDefined();

    await cli.shutdown();
  });
});
