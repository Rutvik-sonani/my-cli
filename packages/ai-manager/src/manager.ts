import { MyCliError } from '@mycli-cli/core';
import { type FileSystem, createFileSystem } from '@mycli-cli/filesystem';
import { type TemplateEngine, createTemplateEngine } from '@mycli-cli/template-engine';
import type {
  AiGenerateOptions,
  AiGenerateResult,
  AiProvider,
  AiSetupOptions,
  AiSetupResult,
} from './types.js';

function buildPrompt(options: AiGenerateOptions): string {
  const fields = options.fields ? ` with fields ${options.fields}` : '';
  return `Generate a MyCLI ${options.target} named "${options.name}"${fields} following project conventions under src/modules/.`;
}

function providerEnv(provider: AiProvider): Record<string, string> {
  switch (provider) {
    case 'openai':
      return { AI_PROVIDER: 'openai', OPENAI_API_KEY: '', OPENAI_MODEL: 'gpt-4o-mini' };
    case 'anthropic':
      return {
        AI_PROVIDER: 'anthropic',
        ANTHROPIC_API_KEY: '',
        ANTHROPIC_MODEL: 'claude-3-5-sonnet-latest',
      };
    case 'ollama':
      return {
        AI_PROVIDER: 'ollama',
        OLLAMA_HOST: 'http://localhost:11434',
        OLLAMA_MODEL: 'llama3.2',
      };
  }
}

export class AiManager {
  private readonly fs: FileSystem;
  private readonly templates: TemplateEngine;

  constructor(
    options: {
      cwd?: string;
      filesystem?: FileSystem;
      templateEngine?: TemplateEngine;
      templatesRoot?: string;
    } = {},
  ) {
    const cwd = options.cwd ?? process.cwd();
    this.fs = options.filesystem ?? createFileSystem(cwd);
    this.templates =
      options.templateEngine ??
      createTemplateEngine({
        filesystem: this.fs,
        templatesRoot: options.templatesRoot ?? 'templates',
      });
  }

  async setup(options: AiSetupOptions): Promise<AiSetupResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const provider = options.provider ?? 'openai';
    const data = { appName: options.appName, provider };
    const written: string[] = [];

    const files = [
      { template: 'features/ai/client.ts.ejs', out: 'src/ai/client.ts' },
      { template: 'features/ai/prompts.ts.ejs', out: 'src/ai/prompts.ts' },
      { template: 'features/ai/index.ts.ejs', out: 'src/ai/index.ts' },
      { template: 'features/ai/AI.md.ejs', out: 'AI.md' },
    ];

    for (const file of files) {
      const content = await this.templates.renderFile(file.template, { data });
      if (!options.dryRun) {
        await fs.write(file.out, content);
      }
      written.push(file.out);
    }

    if (!options.dryRun) {
      const envLines = Object.entries(providerEnv(provider))
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');
      await fs.append('.env.example', `\n# AI\n${envLines}\n`);
    }
    written.push('.env.example');

    return { files: written };
  }

  async generate(options: AiGenerateOptions): Promise<AiGenerateResult> {
    const provider =
      options.provider ?? (process.env.AI_PROVIDER as AiProvider | undefined) ?? 'openai';
    const prompt = buildPrompt(options);
    const commands = [`# AI ${provider} completion for: ${options.target} ${options.name}`];

    if (options.dryRun) {
      return {
        prompt,
        provider,
        executed: false,
        commands: [`Would send prompt to ${provider}`, prompt],
      };
    }

    const apiKey =
      provider === 'openai'
        ? process.env.OPENAI_API_KEY
        : provider === 'anthropic'
          ? process.env.ANTHROPIC_API_KEY
          : undefined;

    if (provider !== 'ollama' && !apiKey) {
      throw new MyCliError(
        `${provider.toUpperCase()} API key not configured. Set env vars or use --dry-run to preview.`,
        { code: 'AI_ERROR' },
      );
    }

    // Production path: integrate provider SDKs. For scaffold, return structured plan.
    return {
      prompt,
      provider,
      executed: false,
      output: `# Planned generation\n\n${prompt}\n\nUse \`my make ${options.target} ${options.name}\` to scaffold locally, or configure API keys for remote generation.`,
      commands,
    };
  }
}

export function createAiManager(options?: {
  cwd?: string;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
}): AiManager {
  return new AiManager(options);
}

export type {
  AiProvider,
  AiGenerateTarget,
  AiSetupOptions,
  AiSetupResult,
  AiGenerateOptions,
  AiGenerateResult,
} from './types.js';
