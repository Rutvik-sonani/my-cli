import { createArchitectureEngine } from '@mycli-cli/architecture-engine';
import type { CliEngine } from '@mycli-cli/cli-engine';
import { defineCommand } from '@mycli-cli/command-engine';
import pc from 'picocolors';
import { resolveTemplatesRoot } from '../paths.js';

export function architectureCommand(engine: CliEngine) {
  return defineCommand({
    name: 'architecture',
    description: 'List architecture styles, validate boundaries, and configure ESLint rules',
    arguments: [
      {
        name: 'action',
        description: 'list | validate | setup-lint',
        required: false,
      },
    ],
    options: [
      { flags: '--dry-run', description: 'Preview without writing files', defaultValue: false },
    ],
    examples: [
      'my architecture list',
      'my architecture validate',
      'my architecture setup-lint',
      'my architecture setup-lint --dry-run',
    ],
    async handler(ctx) {
      const t = (key: string, params?: Record<string, string>) => engine.i18n.t(key, params);
      const action = String(ctx.args.action ?? 'list').toLowerCase();
      const dryRun = Boolean(ctx.options.dryRun);

      const arch = createArchitectureEngine({
        cwd: engine.app.cwd,
        templatesRoot: resolveTemplatesRoot(),
      });

      if (action === 'list') {
        engine.prompts.intro(t('architecture_list_intro'));
        for (const style of arch.listStyles()) {
          engine.prompts.info(`${pc.cyan(style.style)} — ${style.label}`);
          console.log(pc.dim(`  ${style.description}`));
        }
        engine.prompts.outro(t('architecture_list_outro'));
        return;
      }

      if (action === 'validate') {
        engine.prompts.intro(t('architecture_validate_intro'));
        const result = await arch.validate();
        if (result.rulesLoaded === 0) {
          engine.prompts.warn(t('architecture_no_rules'));
          return;
        }
        engine.prompts.note(
          `Style: ${result.style ?? 'unknown'} · Rules: ${result.rulesLoaded} · Files scanned: ${result.filesScanned}`,
          'Scan',
        );
        if (result.ok) {
          engine.prompts.success(t('architecture_validate_pass'));
        } else {
          for (const violation of result.violations) {
            engine.prompts.error(violation.message);
          }
          engine.prompts.outro(
            t('architecture_validate_fail', { count: String(result.violations.length) }),
          );
          throw new Error(
            `Architecture validation failed (${result.violations.length} violations)`,
          );
        }
        engine.prompts.outro(t('architecture_validate_outro'));
        return;
      }

      if (action === 'setup-lint' || action === 'setup-eslint' || action === 'lint') {
        engine.prompts.intro(t('architecture_setup_lint_intro'));
        const { file } = await arch.setupEslint({ dryRun });
        if (dryRun) {
          engine.prompts.info(`[dry-run] Would write ${file}`);
        } else {
          engine.prompts.success(t('architecture_setup_lint_done', { file }));
          engine.prompts.note(
            "import architectureConfig from './eslint.architecture.config.js';\nexport default [...architectureConfig, ...yourConfig];",
            'Merge into eslint.config.js',
          );
        }
        engine.prompts.outro(t('architecture_setup_lint_outro'));
        return;
      }

      throw new Error(`Unknown architecture action: ${action}. Use list, validate, or setup-lint.`);
    },
  });
}
