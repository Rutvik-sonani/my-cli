import { describe, expect, it } from 'vitest';
import {
  getIdentityDependencies,
  normalizeIdentityProvider,
  normalizeIdentityProviders,
  protocolsForProviders,
} from '../src/config.js';
import { IdentityProviderRegistry } from '../src/runtime/registry.js';

describe('IdentityProviderRegistry', () => {
  it('registers and authenticates providers', async () => {
    const registry = new IdentityProviderRegistry();
    registry.register({
      id: 'google',
      protocol: 'oidc',
      authenticate: async () => ({
        id: '1',
        email: 'a@b.com',
        provider: 'google',
        claims: {},
      }),
    });

    const user = await registry.authenticate('google', { code: 'x' });
    expect(user.email).toBe('a@b.com');
  });
});

describe('identity config', () => {
  it('normalizes provider aliases', () => {
    expect(normalizeIdentityProvider('azure')).toBe('azure-ad');
    expect(normalizeIdentityProviders('google,okta')).toEqual(['google', 'okta']);
  });

  it('derives protocols from providers', () => {
    expect(protocolsForProviders(['google', 'saml'])).toEqual(['oidc', 'oauth2', 'saml']);
  });

  it('returns provider-specific dependencies', () => {
    const deps = getIdentityDependencies(['google', 'saml', 'ldap']);
    expect(deps.dependencies['openid-client']).toBeDefined();
    expect(deps.dependencies['@node-saml/node-saml']).toBeDefined();
    expect(deps.dependencies.ldapts).toBeDefined();
  });
});
