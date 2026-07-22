export type AiProvider = 'openai' | 'anthropic' | 'ollama';
export type AiGenerateTarget = 'module' | 'crud' | 'service' | 'controller' | 'test';

export interface AiSetupOptions {
  appName: string;
  cwd?: string;
  provider?: AiProvider;
  dryRun?: boolean;
}

export interface AiSetupResult {
  files: string[];
}

export interface AiGenerateOptions {
  target: AiGenerateTarget;
  name: string;
  fields?: string;
  provider?: AiProvider;
  cwd?: string;
  dryRun?: boolean;
}

export interface AiGenerateResult {
  prompt: string;
  provider: AiProvider;
  executed: boolean;
  output?: string;
  commands: string[];
}
