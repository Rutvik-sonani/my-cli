import type { CliEngine } from '@mycli-cli/cli-engine';
import { defineCommand } from '@mycli-cli/command-engine';
import { createConfigManager } from '@mycli-cli/config-manager';
import { createFileSystem } from '@mycli-cli/filesystem';
import {
  type TemplateVisibility,
  createTemplateMarketplaceManager,
} from '@mycli-cli/template-marketplace-engine';
import { resolveTemplatesRoot } from '../paths.js';

function parseVisibility(value: unknown): TemplateVisibility | undefined {
  if (value === 'public' || value === 'private' || value === 'organization') return value;
  return undefined;
}

export function templateCommand(engine: CliEngine) {
  return defineCommand({
    name: 'template',
    description: 'Template marketplace — search, install, and publish project templates',
    arguments: [
      { name: 'action', description: 'setup | search | install | publish', required: false },
      { name: 'name', description: 'Query, template name, or publish directory', required: false },
    ],
    options: [
      { flags: '--dry-run', description: 'Preview without writing files', defaultValue: false },
      {
        flags: '--visibility <type>',
        description: 'public | private | organization',
      },
      { flags: '--org <name>', description: 'Organization slug for organization templates' },
      { flags: '--tag <tag>', description: 'Filter search by tag' },
    ],
    examples: [
      'my template setup',
      'my template search api',
      'my template search --visibility public',
      'my template install api-crud',
      'my template publish ./my-template --visibility private',
      'my template publish ./acme-tpl --visibility organization --org acme',
    ],
    async handler(ctx) {
      const t = (key: string, params?: Record<string, string>) => engine.i18n.t(key, params);
      const action = (ctx.args.action as string | undefined) ?? 'search';
      const name = ctx.args.name as string | undefined;
      const dryRun = Boolean(ctx.options.dryRun);
      const cwd = engine.app.cwd;
      const visibility = parseVisibility(ctx.options.visibility);
      const organization = ctx.options.org as string | undefined;
      const tags = ctx.options.tag as string | undefined;
      const tagList = tags ? [tags] : undefined;

      const config = createConfigManager({ cwd });
      await config.load();
      const fs = createFileSystem(cwd);
      const templatesRoot = resolveTemplatesRoot();
      const projectName = config.get().projectName ?? 'app';
      const language = config.get().generators?.language ?? config.get().language ?? 'typescript';
      const pathConfig = config.get().paths as { templateMarketplace?: string };

      const marketplace = createTemplateMarketplaceManager({
        cwd,
        filesystem: fs,
        templatesRoot,
      });

      if (action === 'setup') {
        const result = await marketplace.setup({
          appName: projectName,
          paths: pathConfig,
          language: language === 'javascript' ? 'javascript' : 'typescript',
          dryRun,
        });

        config.enableFeature('templateMarketplace');
        if (!dryRun) {
          config.set('paths', {
            ...config.get().paths,
            templateMarketplace: pathConfig.templateMarketplace ?? 'src/template-marketplace',
          });
          await config.save();
        }

        engine.prompts.success(t('template_setup_done', { count: String(result.files.length) }));
        return;
      }

      if (action === 'search') {
        const result = await marketplace.search({
          query: name,
          visibility,
          organization,
          tags: tagList,
        });

        if (result.templates.length === 0) {
          engine.prompts.info(t('template_search_empty', { query: name ?? '*' }));
          return;
        }

        engine.prompts.note(
          result.templates
            .map(
              (tpl) =>
                `${tpl.name}@${tpl.version} [${tpl.visibility}] — ${tpl.description} (${tpl.downloads ?? 0} downloads)`,
            )
            .join('\n'),
          t('template_search_title', { count: String(result.total) }),
        );
        engine.prompts.success(
          t('template_search_done', { count: String(result.templates.length) }),
        );
        return;
      }

      if (action === 'install') {
        if (!name) throw new Error('Template name is required: my template install <name>');
        const result = await marketplace.install({ name, dryRun });
        if (dryRun) {
          engine.prompts.info(result.message);
        } else {
          config.enableFeature('templateMarketplace');
          await config.save();
          engine.prompts.success(
            t('template_install_done', {
              name: result.template.name,
              version: result.template.version,
              path: result.path,
            }),
          );
        }
        return;
      }

      if (action === 'publish') {
        if (!name) throw new Error('Template directory is required: my template publish <dir>');
        const result = await marketplace.publish({
          templateDir: name,
          dryRun,
          visibility,
          organization,
        });
        if (dryRun) {
          engine.prompts.info(result.message);
        } else {
          engine.prompts.success(
            t('template_publish_done', {
              name: result.template.name,
              version: result.template.version,
              visibility: result.template.visibility,
              path: result.catalogPath,
            }),
          );
        }
        return;
      }

      throw new Error(
        `Unknown template action: ${action}. Use: setup | search | install | publish`,
      );
    },
  });
}
