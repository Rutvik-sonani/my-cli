export { ArchitectureEngine, createArchitectureEngine } from './engine.js';
export type { ArchitectureEngineOptions } from './engine.js';
export { setupLegacyArchitecture } from './legacy.js';
export {
  validateArchitectureBoundaries,
  validateArchitectureBoundariesFromDisk,
  loadDependencyRules,
} from './validate.js';
export type { ArchitectureValidationResult, ArchitectureViolation } from './validate.js';
export { buildEslintArchitectureConfig } from './eslint-config.js';
export type { EslintArchitectureConfig } from './eslint-config.js';
export {
  getArchitectureProvider,
  isLegacyArchitectureStyle,
  listAllArchitectureStyles,
  listEnterpriseArchitectureStyles,
  mvcProvider,
  modularMonolithProvider,
  cleanArchitectureProvider,
  hexagonalProvider,
  dddProvider,
  microserviceProvider,
} from './providers/index.js';
export type {
  ArchitectureEngineSetupOptions,
  ArchitectureEngineSetupResult,
  ArchitectureModulePaths,
  ArchitectureStyle,
  ArchitectureStyleInfo,
  ArchitectureStyleProvider,
  ArchitectureTemplateFile,
  DependencyRule,
  EnterpriseArchitectureStyle,
  LegacyArchitectureStyle,
} from './types.js';
