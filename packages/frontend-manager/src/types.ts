export type FrontendFramework = 'none' | 'react' | 'next' | 'vue' | 'nuxt' | 'angular';

export interface FrontendSetupOptions {
  cwd?: string;
  framework: FrontendFramework;
  language?: 'typescript' | 'javascript';
  appName: string;
  dryRun?: boolean;
}

export interface FrontendSetupResult {
  files: string[];
}
