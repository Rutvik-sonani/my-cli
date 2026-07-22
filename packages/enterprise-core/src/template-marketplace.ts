/**
 * Template marketplace contracts (Phase 16).
 */
export type TemplateVisibility = 'public' | 'private' | 'organization';

export interface TemplateRequirements {
  features?: string[];
  database?: string[];
  architectureStyles?: string[];
  minCliVersion?: string;
}

export interface MarketplaceTemplate {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  visibility: TemplateVisibility;
  organization?: string;
  compatibility: string;
  requirements?: TemplateRequirements;
  tags?: string[];
  downloads?: number;
  /** Relative path inside a catalog root, when installed locally */
  path?: string;
}

export interface TemplateSearchOptions {
  query?: string;
  visibility?: TemplateVisibility | TemplateVisibility[];
  organization?: string;
  tags?: string[];
  limit?: number;
}

export interface TemplateSearchResult {
  templates: MarketplaceTemplate[];
  total: number;
}

export interface TemplateInstallRecord {
  id: string;
  name: string;
  version: string;
  installedAt: string;
  path: string;
  visibility: TemplateVisibility;
}

export interface TemplateCatalog {
  version: string;
  updatedAt: string;
  templates: MarketplaceTemplate[];
}
