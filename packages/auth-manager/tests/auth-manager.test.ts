import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSystem } from '@mycli/filesystem';
import { afterEach, describe, expect, it } from 'vitest';
import { createAuthManager } from '../src/index.js';
import { assertTypeScriptParses, featureTemplatesRoot } from './helpers.js';

describe('AuthManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('generates JWT auth module with jose token service', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-auth-'));
    const fs = createFileSystem(dir);
    const auth = createAuthManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    const result = await auth.setup({
      strategies: ['jwt', 'refresh-token'],
      orm: 'prisma',
    });

    expect(result.files.length).toBeGreaterThan(5);
    expect(result.dependencies.jose).toBeDefined();

    const tokenService = await readFile(join(dir, 'src/modules/auth/token.service.ts'), 'utf8');
    expect(tokenService).toContain('SignJWT');
    expect(tokenService).toContain('jwtVerify');

    const routes = await readFile(join(dir, 'src/modules/auth/auth.routes.ts'), 'utf8');
    expect(routes).toContain('/auth/refresh');
    expect(routes).toContain('/auth/login');

    const barrel = await readFile(join(dir, 'src/modules/index.ts'), 'utf8');
    expect(barrel).toContain('./auth/index.js');

    const featureRoutes = await readFile(join(dir, 'src/routes/features.ts'), 'utf8');
    expect(featureRoutes).toContain('registerAuthRoutes');
  });

  it('generates passkeys service when passkeys strategy selected', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-auth-passkeys-'));
    const fs = createFileSystem(dir);
    const auth = createAuthManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    const result = await auth.setup({
      strategies: ['jwt', 'passkeys'],
      orm: 'none',
    });

    const passkeys = await readFile(join(dir, 'src/modules/auth/passkeys.service.ts'), 'utf8');
    expect(passkeys).toContain('PasskeysService');
    expect(passkeys).toContain('verifyRegistrationResponse');
    expect(result.dependencies['@simplewebauthn/server']).toBeDefined();

    const env = await readFile(join(dir, '.env.example'), 'utf8');
    expect(env).toContain('WEBAUTHN_RP_ID');
  });

  it('generates optional OAuth service when oauth strategy selected', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-auth-oauth-'));
    const fs = createFileSystem(dir);
    const auth = createAuthManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    await auth.setup({
      strategies: ['jwt', 'oauth'],
      oauthProviders: ['google', 'github'],
      orm: 'none',
    });

    const oauth = await readFile(join(dir, 'src/modules/auth/oauth.service.ts'), 'utf8');
    expect(oauth).toContain('OAuthService');
    expect(oauth).toContain('arctic');
    expect(oauth).toContain('createAuthorizationUrl');

    const env = await readFile(join(dir, '.env.example'), 'utf8');
    expect(env).toContain('GOOGLE_CLIENT_ID');
    expect(env).toContain('GITHUB_CLIENT_ID');
  });

  it('generates magic link repository and MFA with otplib', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-auth-magic-'));
    const fs = createFileSystem(dir);
    const auth = createAuthManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    const result = await auth.setup({
      strategies: ['jwt', 'magic-link', 'mfa'],
      orm: 'prisma',
    });

    const magic = await readFile(join(dir, 'src/modules/auth/magic-link.repository.ts'), 'utf8');
    expect(magic).toContain('MagicLinkRepository');
    const mfa = await readFile(join(dir, 'src/modules/auth/mfa.service.ts'), 'utf8');
    expect(mfa).toContain('authenticator');
    expect(result.dependencies.otplib).toBeDefined();
  });

  it('supports dry-run without writing files', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-auth-dry-'));
    const fs = createFileSystem(dir);
    const auth = createAuthManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    const result = await auth.setup({
      strategies: ['jwt'],
      dryRun: true,
    });

    expect(result.files.length).toBeGreaterThan(0);
    expect(await fs.exists('src/modules/auth/auth.service.ts')).toBe(false);
  });

  it('uses TypeORM user repository template when orm is typeorm', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-auth-typeorm-'));
    const fs = createFileSystem(dir);
    const auth = createAuthManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    await auth.setup({
      strategies: ['jwt'],
      orm: 'typeorm',
    });

    const repo = await readFile(join(dir, 'src/modules/auth/user.repository.ts'), 'utf8');
    expect(repo).toContain('AppDataSource');
    expect(repo).toContain('getRepository');
  });

  it('generated auth modules parse as valid TypeScript', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-auth-parse-'));
    const fs = createFileSystem(dir);
    const auth = createAuthManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    const result = await auth.setup({
      strategies: ['jwt', 'refresh-token', 'oauth', 'magic-link'],
      oauthProviders: ['google'],
      orm: 'prisma',
    });

    const tsFiles = result.files.filter((file) => file.endsWith('.ts'));
    assertTypeScriptParses(dir, tsFiles);
  });
});
