import type {
  ArchitectureModulePaths,
  ArchitectureStyle,
  ArchitectureTemplateFile,
  DependencyRule,
} from '../types.js';
export function enterpriseTemplate(
  style: string,
  file: string,
  out: string,
): ArchitectureTemplateFile {
  return { template: `architecture-engine/${style}/${file}`, out };
}

export interface EnterpriseProviderConfig {
  style: ArchitectureStyle;
  label: string;
  description: string;
  modulePaths: ArchitectureModulePaths;
  dependencyRules: DependencyRule[];
  files: ArchitectureTemplateFile[];
}

export function defineEnterpriseProvider(config: EnterpriseProviderConfig) {
  return {
    style: config.style,
    label: config.label,
    description: config.description,
    getModulePaths: (): ArchitectureModulePaths => config.modulePaths,
    getDependencyRules: (): DependencyRule[] => config.dependencyRules,
    getTemplateFiles: (): ArchitectureTemplateFile[] => config.files,
  };
}
