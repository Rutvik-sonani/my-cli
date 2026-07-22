/**
 * Enterprise identity contracts (Phase 6).
 */
export type IdentityProtocol = 'oauth2' | 'oidc' | 'saml' | 'ldap';

export type IdentityProviderId =
  | 'google'
  | 'azure-ad'
  | 'okta'
  | 'keycloak'
  | 'saml'
  | 'ldap'
  | 'active-directory';

export interface IdentityUser {
  id: string;
  email?: string;
  name?: string;
  provider: IdentityProviderId;
  claims: Record<string, unknown>;
}

export interface IdentitySession {
  id: string;
  userId: string;
  provider: IdentityProviderId;
  expiresAt: Date;
  metadata?: Record<string, string>;
}

export interface IdentityProviderConfig {
  id: IdentityProviderId;
  protocol: IdentityProtocol;
  issuer?: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
}

export interface IdentityProvider {
  readonly id: IdentityProviderId;
  readonly protocol: IdentityProtocol;
  authenticate(input: Record<string, unknown>): Promise<IdentityUser>;
}

export interface IdentitySessionStore {
  create(session: IdentitySession): Promise<void>;
  get(sessionId: string): Promise<IdentitySession | null>;
  delete(sessionId: string): Promise<void>;
}
