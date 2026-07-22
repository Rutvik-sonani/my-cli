export {
  INSTALLED_MANIFEST,
  INSTALLED_TEMPLATES_DIR,
  LOCAL_CATALOG_DIR,
  LOCAL_CATALOG_INDEX,
  createBuiltinTemplates,
  createTemplateStubFiles,
  getTemplateMarketplaceEnvLines,
  resolveTemplateMarketplacePaths,
  type TemplateMarketplacePathConfig,
  type TemplateMarketplacePaths,
} from './config.js';
export {
  TemplateMarketplaceManager,
  createTemplateMarketplaceManager,
  type TemplateMarketplaceSetupOptions,
  type TemplateMarketplaceSetupResult,
} from './manager.js';
export {
  TemplateMarketplaceService,
  createTemplateMarketplaceService,
  type TemplateMarketplaceServiceOptions,
} from './runtime/template-marketplace-service.js';
export type {
  MarketplaceTemplate,
  TemplateCatalog,
  TemplateInstallRecord,
  TemplateRequirements,
  TemplateSearchOptions,
  TemplateSearchResult,
  TemplateVisibility,
} from '@mycli/enterprise-core';
