/**
 * Enterprise architecture styles (Phase 1+).
 */
export type EnterpriseArchitectureStyle =
  | 'mvc'
  | 'modular-monolith'
  | 'clean-architecture'
  | 'hexagonal'
  | 'domain-driven-design'
  | 'microservice';

export type LegacyArchitectureStyle = 'monolith' | 'monorepo' | 'polyrepo';

export type ArchitectureStyle = EnterpriseArchitectureStyle | LegacyArchitectureStyle;

export interface DependencyRule {
  layer: string;
  path: string;
  mayImport: string[];
  mustNotImport: string[];
  description: string;
}

export interface ArchitectureDependencyRulesFile {
  version: string;
  style: ArchitectureStyle;
  label: string;
  appName: string;
  generatedBy: string;
  rules: DependencyRule[];
}

export interface ArchitectureModulePaths {
  modules: string;
  domain?: string;
  application?: string;
  infrastructure?: string;
  presentation?: string;
  controllers?: string;
  services?: string;
}

export interface ArchitectureStyleInfo {
  style: ArchitectureStyle;
  label: string;
  description: string;
}
