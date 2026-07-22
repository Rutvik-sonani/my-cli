export {
  DOCUMENTATION_CATALOG,
  getDocumentationEnvLines,
  listDocumentationDocuments,
  parseDocumentationKinds,
  resolveDocumentationPaths,
  templatePathForKind,
  type DocumentationPathConfig,
  type DocumentationPaths,
} from './config.js';
export {
  DocumentationManager,
  createDocumentationManager,
  type DocumentationRunOptions,
  type DocumentationSetupOptions,
  type DocumentationSetupResult,
} from './manager.js';
export {
  DocumentationGenerator,
  createDocumentationGenerator,
  type DocumentationContext,
  type DocumentationGeneratorOptions,
} from './runtime/documentation-generator.js';
export type {
  DocumentationDocument,
  DocumentationGenerateOptions,
  DocumentationGenerateReport,
  DocumentationGenerateResultItem,
  DocumentationGenerateStatus,
  DocumentationKind,
} from '@mycli-cli/enterprise-core';
