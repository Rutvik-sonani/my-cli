import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSystem } from '@mycli/filesystem';
import { createTemplateEngine } from '@mycli/template-engine';
import { afterEach, describe, expect, it } from 'vitest';
import { createEnterpriseAuthManager } from '../src/manager.js';

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('EnterpriseAuthManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('scaffolds google oidc provider', async () => {
    dir = await mkdtemp(join(tmpdir(), 'identity-engine-'));
    const fs = createFileSystem(dir);
    const templatesRoot = join(import.meta.dirname, '../../../apps/cli/templates');
    const manager = createEnterpriseAuthManager({
      cwd: dir,
      filesystem: fs,
      templateEngine: createTemplateEngine({ filesystem: fs, templatesRoot }),
      templatesRoot,
    });

    const result = await manager.setup({
      appName: 'demo',
      providers: ['google'],
      language: 'typescript',
    });

    expect(result.dependencies['openid-client']).toBeDefined();
    expect(await pathExists(join(dir, 'src/identity/providers/google.provider.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/identity/strategies/oidc.strategy.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/identity/guards/identity.guard.ts'))).toBe(true);

    const register = await readFile(join(dir, 'src/identity/register-identity.ts'), 'utf8');
    expect(register).toContain('GoogleIdentityProvider');
  });

  it('scaffolds saml and ldap providers with strategies', async () => {
    dir = await mkdtemp(join(tmpdir(), 'identity-engine-mix-'));
    const fs = createFileSystem(dir);
    const templatesRoot = join(import.meta.dirname, '../../../apps/cli/templates');
    const manager = createEnterpriseAuthManager({
      cwd: dir,
      filesystem: fs,
      templateEngine: createTemplateEngine({ filesystem: fs, templatesRoot }),
      templatesRoot,
    });

    const result = await manager.setup({
      appName: 'corp',
      providers: ['saml', 'ldap', 'active-directory'],
      language: 'typescript',
    });

    expect(result.dependencies['@node-saml/node-saml']).toBeDefined();
    expect(result.dependencies.ldapts).toBeDefined();
    expect(await pathExists(join(dir, 'src/identity/providers/saml.provider.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/identity/providers/active-directory.provider.ts'))).toBe(
      true,
    );
  });
});
