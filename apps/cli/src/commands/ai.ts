import { type AiGenerateTarget, createAiManager } from '@mycli/ai-manager';
import type { CliEngine } from '@mycli/cli-engine';
import { defineCommand } from '@mycli/command-engine';
import { createConfigManager } from '@mycli/config-manager';
import { createFileSystem } from '@mycli/filesystem';
import { resolveTemplatesRoot } from '../paths.js';

const TARGETS = new Set(['module', 'crud', 'service', 'controller', 'test']);

export function aiCommand(engine: CliEngine) {
  return defineCommand({
    name: 'ai',
    description: 'AI-assisted code generation',
    arguments: [
      { name: 'action', description: 'generate', required: false },
      {
        name: 'target',
        description: 'module | crud | service | controller | test',
        required: false,
      },
      { name: 'name', description: 'Resource name', required: false },
    ],
    options: [
      { flags: '--fields <fields>', description: 'Fields e.g. name:string,price:number' },
      { flags: '--provider <provider>', description: 'openai | anthropic | ollama' },
      {
        flags: '--dry-run',
        description: 'Preview prompt without calling provider',
        defaultValue: false,
      },
    ],
    examples: [
      'my ai generate module user',
      'my ai generate crud product --fields name:string,price:number',
      'my ai generate service billing --dry-run',
    ],
    async handler(ctx) {
      const t = (key: string, params?: Record<string, string>) => engine.i18n.t(key, params);
      const action = (ctx.args.action as string | undefined) ?? 'generate';
      if (action !== 'generate') {
        throw new Error(`Unknown ai action: ${action}`);
      }

      const target = (ctx.args.target as string | undefined) ?? 'module';
      const name = ctx.args.name as string | undefined;
      if (!name) {
        throw new Error('Name is required: my ai generate <target> <name>');
      }
      if (!TARGETS.has(target)) {
        throw new Error(`Unknown target: ${target}`);
      }

      const dryRun = Boolean(ctx.options.dryRun);
      const cwd = engine.app.cwd;
      const config = createConfigManager({ cwd });
      await config.load();

      const ai = createAiManager({
        cwd,
        filesystem: createFileSystem(cwd),
        templatesRoot: resolveTemplatesRoot(),
      });

      const result = await ai.generate({
        target: target as AiGenerateTarget,
        name,
        fields: ctx.options.fields as string | undefined,
        provider: ctx.options.provider as 'openai' | 'anthropic' | 'ollama' | undefined,
        dryRun,
      });

      if (dryRun) {
        engine.prompts.info(t('ai_planned'));
        for (const command of result.commands) {
          console.log(`  ${command}`);
        }
        console.log(`\n${result.prompt}`);
        return;
      }

      if (result.output) {
        console.log(result.output);
      }
      engine.prompts.success(t('ai_success', { provider: result.provider }));
    },
  });
}
