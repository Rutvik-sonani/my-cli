import type {
  ArchitectureModulePaths,
  ArchitectureStyle,
  DependencyRule,
} from '@mycli/enterprise-core';

export type {
  ArchitectureDependencyRulesFile,
  ArchitectureModulePaths,
  ArchitectureStyle,
  ArchitectureStyleInfo,
  DependencyRule,
  EnterpriseArchitectureStyle,
  LegacyArchitectureStyle,
} from '@mycli/enterprise-core';

export interface ArchitectureTemplateFile {
  template: string;
  out: string;
}

export interface ArchitectureEngineSetupOptions {
  cwd?: string;
  style: ArchitectureStyle;
  appName: string;
  backend?: string;
  frontend?: string;
  language?: 'typescript' | 'javascript';
  dryRun?: boolean;
}

export interface ArchitectureEngineSetupResult {
  files: string[];
  style: ArchitectureStyle;
  label: string;
  modulePaths: ArchitectureModulePaths;
  dependencyRules: DependencyRule[];
}

export interface ArchitectureStyleProvider {
  readonly style: ArchitectureStyle;
  readonly label: string;
  readonly description: string;
  getModulePaths(): ArchitectureModulePaths;
  getDependencyRules(): DependencyRule[];
  getTemplateFiles(): ArchitectureTemplateFile[];
}
