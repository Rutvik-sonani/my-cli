import type { CliEngine } from '@mycli/cli-engine';
import { defineCommand } from '@mycli/command-engine';
import { createConfigManager } from '@mycli/config-manager';
import { createDocumentationManager } from '@mycli/documentation-engine';
import { createFileSystem } from '@mycli/filesystem';
import { resolveTemplatesRoot } from '../paths.js';

export function docsCommand(engine: CliEngine) {
  return defineCommand({
    name: 'docs',
    description:
      'Enterprise documentation — generate ARCHITECTURE, SECURITY, OPERATIONS, SCALING, DR, and API guides',
    arguments: [{ name: 'action', description: 'setup | list | generate', required: false }],
    options: [
      { flags: '--dry-run', description: 'Preview without writing files', defaultValue: false },
      {
        flags: '--force',
        description: 'Overwrite existing documentation files',
        defaultValue: false,
      },
      {
        flags: '--only <kinds>',
        description:
          'Comma-separated kinds: architecture,security,compliance,operations,scaling,disaster-recovery,api-guide',
      },
    ],
    examples: [
      'my docs setup',
      'my docs list',
      'my docs generate',
      'my docs generate --only architecture,security',
      'my docs generate --force',
      'my docs generate --dry-run',
    ],
    async handler(ctx) {
      const t = (key: string, params?: Record<string, string>) => engine.i18n.t(key, params);
      const action = (ctx.args.action as string | undefined) ?? 'generate';
      const dryRun = Boolean(ctx.options.dryRun);
      const force = Boolean(ctx.options.force);
      const onlyRaw = ctx.options.only as string | undefined;
      const cwd = engine.app.cwd;
      const templatesRoot = resolveTemplatesRoot();

      const config = createConfigManager({ cwd });
      await config.load();
      const fs = createFileSystem(cwd);
      const projectName = config.get().projectName ?? 'app';
      const language = config.get().generators?.language ?? config.get().language ?? 'typescript';
      const pathConfig = config.get().paths as { documentation?: string };

      const docs = createDocumentationManager({ cwd, filesystem: fs, templatesRoot });

      if (action === 'setup') {
        const result = await docs.setup({
          appName: projectName,
          paths: pathConfig,
          language: language === 'javascript' ? 'javascript' : 'typescript',
          dryRun,
        });
        config.enableFeature('documentation');
        if (!dryRun) {
          config.set('paths', {
            ...config.get().paths,
            documentation: pathConfig.documentation ?? 'src/documentation',
          });
          await config.save();
        }
        engine.prompts.success(t('docs_setup_done', { count: String(result.files.length) }));
        return;
      }

      if (action === 'list') {
        const catalog = docs.list();
        engine.prompts.note(
          catalog.map((d) => `${d.filename} — ${d.description}`).join('\n'),
          t('docs_list_title', { count: String(catalog.length) }),
        );
        return;
      }

      if (action === 'generate') {
        const report = await docs.generate({
          cwd,
          projectName,
          templatesRoot,
          dryRun,
          force,
          onlyRaw,
        });

        for (const item of report.results) {
          const prefix = dryRun ? '[dry-run] ' : '';
          const reason = item.reason ? ` (${item.reason})` : '';
          engine.prompts.info(`${prefix}${item.filename} → ${item.status}${reason}`);
        }

        if (dryRun) {
          engine.prompts.outro(
            t('docs_generate_dry_run', { count: String(report.results.length) }),
          );
        } else {
          engine.prompts.success(
            t('docs_generate_done', {
              created: String(report.created),
              skipped: String(report.skipped),
              overwritten: String(report.overwritten),
            }),
          );
        }
        return;
      }

      throw new Error(`Unknown docs action: ${action}. Use: setup | list | generate`);
    },
  });
}
