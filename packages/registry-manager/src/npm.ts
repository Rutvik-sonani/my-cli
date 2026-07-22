export interface NpmSearchResult {
  name: string;
  version: string;
  description?: string;
  keywords?: string[];
}

export interface NpmPackageMetadata {
  name: string;
  version: string;
  description?: string;
  keywords?: string[];
}

export class NpmRegistryClient {
  constructor(private readonly registryUrl = 'https://registry.npmjs.org') {}

  async search(query: string, limit = 20): Promise<NpmSearchResult[]> {
    const url = `${this.registryUrl}/-/v1/search?text=${encodeURIComponent(query)}&size=${limit}`;
    const response = await fetch(url);
    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as {
      objects?: Array<{
        package: { name: string; version: string; description?: string; keywords?: string[] };
      }>;
    };

    return (payload.objects ?? [])
      .map((item) => item.package)
      .filter((pkg) => pkg.name.includes('mycli') || pkg.name.startsWith('@mycli/'))
      .map((pkg) => ({
        name: pkg.name,
        version: pkg.version,
        description: pkg.description,
        keywords: pkg.keywords,
      }));
  }

  async getMetadata(name: string): Promise<NpmPackageMetadata | undefined> {
    const response = await fetch(`${this.registryUrl}/${encodeURIComponent(name)}`);
    if (!response.ok) return undefined;

    const payload = (await response.json()) as {
      name: string;
      'dist-tags'?: { latest?: string };
      description?: string;
      keywords?: string[];
    };

    return {
      name: payload.name,
      version: payload['dist-tags']?.latest ?? '0.0.0',
      description: payload.description,
      keywords: payload.keywords,
    };
  }

  planInstall(name: string, targetDir: string): string[] {
    return [`npm install ${name} --prefix ${targetDir} --no-save`];
  }
}

export function createNpmRegistryClient(registryUrl?: string): NpmRegistryClient {
  return new NpmRegistryClient(registryUrl);
}
