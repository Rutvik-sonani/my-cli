import { join } from 'node:path';
import type { IdentityProtocol, IdentityProviderId } from '@mycli/enterprise-core';

export interface IdentityPathConfig {
  identity?: string;
}

export interface IdentityPaths {
  root: string;
  providers: string;
  strategies: string;
  guards: string;
  sessions: string;
}

export function resolveIdentityPaths(config: IdentityPathConfig = {}): IdentityPaths {
  const root = config.identity ?? 'src/identity';

  return {
    root,
    providers: join(root, 'providers'),
    strategies: join(root, 'strategies'),
    guards: join(root, 'guards'),
    sessions: join(root, 'sessions'),
  };
}

export const IDENTITY_PROVIDER_IDS: IdentityProviderId[] = [
  'google',
  'azure-ad',
  'okta',
  'keycloak',
  'saml',
  'ldap',
  'active-directory',
];

export const IDENTITY_PROTOCOLS: IdentityProtocol[] = ['oauth2', 'oidc', 'saml', 'ldap'];

const PROVIDER_PROTOCOL: Record<IdentityProviderId, IdentityProtocol> = {
  google: 'oidc',
  'azure-ad': 'oidc',
  okta: 'oidc',
  keycloak: 'oidc',
  saml: 'saml',
  ldap: 'ldap',
  'active-directory': 'ldap',
};

export function normalizeIdentityProvider(input: string): IdentityProviderId | null {
  const value = input.toLowerCase().replace(/_/g, '-');
  if (value === 'azure' || value === 'azuread') return 'azure-ad';
  if (value === 'ad' || value === 'activedirectory') return 'active-directory';
  return IDENTITY_PROVIDER_IDS.includes(value as IdentityProviderId)
    ? (value as IdentityProviderId)
    : null;
}

export function normalizeIdentityProviders(input: string[] | string): IdentityProviderId[] {
  const list = Array.isArray(input) ? input : input.split(',');
  const normalized = list
    .map((item) => normalizeIdentityProvider(item.trim()))
    .filter((item): item is IdentityProviderId => item !== null);
  return [...new Set(normalized)];
}

export function protocolsForProviders(providers: IdentityProviderId[]): IdentityProtocol[] {
  const protocols = new Set<IdentityProtocol>();
  for (const provider of providers) {
    protocols.add(PROVIDER_PROTOCOL[provider]);
    if (PROVIDER_PROTOCOL[provider] === 'oidc') {
      protocols.add('oauth2');
    }
  }
  return [...protocols];
}

export function getIdentityDependencies(providers: IdentityProviderId[]): {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
} {
  const dependencies: Record<string, string> = {};
  const protocols = protocolsForProviders(providers);

  if (protocols.includes('oauth2') || protocols.includes('oidc')) {
    dependencies['openid-client'] = '^6.3.4';
  }
  if (protocols.includes('saml')) {
    dependencies['@node-saml/node-saml'] = '^5.0.0';
  }
  if (protocols.includes('ldap')) {
    dependencies.ldapts = '^7.3.0';
  }

  return { dependencies, devDependencies: {} };
}

export function getIdentityEnvLines(providers: IdentityProviderId[], appName: string): string[] {
  const lines = [`IDENTITY_APP=${appName}`, 'SESSION_SECRET=change-me'];
  for (const provider of providers) {
    switch (provider) {
      case 'google':
        lines.push(
          'GOOGLE_CLIENT_ID=',
          'GOOGLE_CLIENT_SECRET=',
          'GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback',
        );
        break;
      case 'azure-ad':
        lines.push('AZURE_AD_TENANT_ID=', 'AZURE_AD_CLIENT_ID=', 'AZURE_AD_CLIENT_SECRET=');
        break;
      case 'okta':
        lines.push('OKTA_ISSUER=', 'OKTA_CLIENT_ID=', 'OKTA_CLIENT_SECRET=');
        break;
      case 'keycloak':
        lines.push('KEYCLOAK_ISSUER=', 'KEYCLOAK_CLIENT_ID=', 'KEYCLOAK_CLIENT_SECRET=');
        break;
      case 'saml':
        lines.push('SAML_ENTRY_POINT=', 'SAML_ISSUER=', 'SAML_CERT=');
        break;
      case 'ldap':
        lines.push(
          'LDAP_URL=ldap://localhost:389',
          'LDAP_BIND_DN=',
          'LDAP_BIND_PASSWORD=',
          'LDAP_SEARCH_BASE=',
        );
        break;
      case 'active-directory':
        lines.push(
          'AD_LDAP_URL=ldap://ad.example.com',
          'AD_BIND_DN=',
          'AD_BIND_PASSWORD=',
          'AD_SEARCH_BASE=',
        );
        break;
    }
  }
  return lines;
}

export function providerTemplateFile(provider: IdentityProviderId): string {
  const map: Record<IdentityProviderId, string> = {
    google: 'features/enterprise-auth/providers/google.provider.ts.ejs',
    'azure-ad': 'features/enterprise-auth/providers/azure-ad.provider.ts.ejs',
    okta: 'features/enterprise-auth/providers/okta.provider.ts.ejs',
    keycloak: 'features/enterprise-auth/providers/keycloak.provider.ts.ejs',
    saml: 'features/enterprise-auth/providers/saml.provider.ts.ejs',
    ldap: 'features/enterprise-auth/providers/ldap.provider.ts.ejs',
    'active-directory': 'features/enterprise-auth/providers/active-directory.provider.ts.ejs',
  };
  return map[provider];
}

export function providerClassName(provider: IdentityProviderId): string {
  const map: Record<IdentityProviderId, string> = {
    google: 'GoogleIdentityProvider',
    'azure-ad': 'AzureAdIdentityProvider',
    okta: 'OktaIdentityProvider',
    keycloak: 'KeycloakIdentityProvider',
    saml: 'SamlIdentityProvider',
    ldap: 'LdapIdentityProvider',
    'active-directory': 'ActiveDirectoryIdentityProvider',
  };
  return map[provider];
}
