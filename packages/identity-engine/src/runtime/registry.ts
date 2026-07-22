import type { IdentityProvider, IdentityProviderId, IdentityUser } from '@mycli/enterprise-core';

/**
 * Registry for enterprise identity providers (runtime helper + test double).
 */
export class IdentityProviderRegistry {
  private readonly providers = new Map<IdentityProviderId, IdentityProvider>();

  register(provider: IdentityProvider): this {
    this.providers.set(provider.id, provider);
    return this;
  }

  get(id: IdentityProviderId): IdentityProvider | undefined {
    return this.providers.get(id);
  }

  list(): IdentityProviderId[] {
    return [...this.providers.keys()];
  }

  async authenticate(
    id: IdentityProviderId,
    input: Record<string, unknown>,
  ): Promise<IdentityUser> {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new Error(`Identity provider not registered: ${id}`);
    }
    return provider.authenticate(input);
  }
}
