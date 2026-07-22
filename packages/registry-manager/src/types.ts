export interface RegistryEntry {
  name: string;
  version: string;
  description?: string;
  author?: string;
  downloads?: number;
  compatibility?: string;
  slug?: string;
  npmPackage?: string;
  repository?: string;
  keywords?: string[];
  publishedAt?: string;
}

export interface RegistryCatalog {
  version: string;
  plugins: RegistryEntry[];
}

export interface RegistrySearchOptions {
  query?: string;
  limit?: number;
  registry?: 'local' | 'npm' | 'all';
}

export interface RegistrySearchResult {
  entries: RegistryEntry[];
  total: number;
}

export interface RegistryPublishOptions {
  entry: RegistryEntry;
  dryRun?: boolean;
  publishToNpm?: boolean;
}

export interface RegistryPublishResult {
  entry: RegistryEntry;
  catalogPath: string;
  npmCommands?: string[];
}
