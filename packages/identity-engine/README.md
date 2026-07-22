# @mycli-cli/identity-engine

Enterprise identity and SSO for MyCLI (Phase 6).

## CLI

```bash
my add enterprise-auth
my add enterprise-auth --providers google,azure-ad,okta
my add enterprise-auth --providers saml,ldap
```

## Protocols & providers

| Provider | Protocol |
|----------|----------|
| Google | OIDC / OAuth2 |
| Azure AD | OIDC |
| Okta | OIDC |
| Keycloak | OIDC / OAuth2 |
| SAML | SAML 2.0 |
| LDAP | LDAP |
| Active Directory | LDAP |

## Generated layout

```
src/identity/
  identity-provider.interface.ts
  identity.service.ts
  providers/
  strategies/
  guards/
  sessions/
tests/identity/
ENTERPRISE_AUTH.md
```

Extends base `my add auth` — use both for JWT/session auth plus enterprise SSO.
