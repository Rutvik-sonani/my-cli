import { join } from 'node:path';
import type { CliEngine } from '@mycli-cli/cli-engine';
import { defineCommand } from '@mycli-cli/command-engine';
import { createMarketplaceManager } from '@mycli-cli/marketplace-manager';
import { createPluginScaffold, npmPackageFromName } from '@mycli-cli/plugin-sdk';
import { createRegistryManager } from '@mycli-cli/registry-manager';
import { resolveRepoRoot } from '../paths.js';

function createMarketplace(engine: CliEngine) {
  const repoRoot = resolveRepoRoot();
  const registry = createRegistryManager({ repoRoot });
  return createMarketplaceManager({
    registry,
    plugins: engine.plugins,
    repoRoot,
    cwd: engine.app.cwd,
    cliVersion: engine.app.version,
  });
}

function normalizePluginName(name: string): string {
  if (name.startsWith('@mycli-cli/')) return name;
  if (name.startsWith('@mycli-cli/plugin-'))
    return `@mycli-cli/${name.replace('@mycli-cli/plugin-', '')}`;
  return `@mycli-cli/${name}`;
}

export function pluginCommand(engine: CliEngine) {
  return defineCommand({
    name: 'plugin',
    description: 'Manage MyCLI plugins (marketplace search, install, publish, create)',
    arguments: [
      {
        name: 'action',
        description: 'search | install | update | remove | list | publish | create',
        required: true,
      },
      { name: 'name', description: 'Plugin name, query, or directory', required: false },
    ],
    options: [
      { flags: '--dry-run', description: 'Preview without making changes', defaultValue: false },
      { flags: '--from <source>', description: 'Install source: local | npm | auto' },
      { flags: '--registry <registry>', description: 'Search registry: local | npm | all' },
      { flags: '--npm', description: 'Include npm publish in plugin publish', defaultValue: false },
    ],
    examples: [
      'my plugin list',
      'my plugin search docker',
      'my plugin search mycli --registry npm',
      'my plugin install @mycli-cli/docker',
      'my plugin install @mycli-cli/ai --from npm --dry-run',
      'my plugin create @mycli-cli/plugin-billing',
      'my plugin publish ./my-plugin --dry-run',
      'my plugin publish ./my-plugin --npm',
    ],
    async handler(ctx) {
      const t = (key: string, params?: Record<string, string>) => engine.i18n.t(key, params);
      const action = String(ctx.args.action);
      const name = ctx.args.name as string | undefined;
      const dryRun = Boolean(ctx.options.dryRun);
      const marketplace = createMarketplace(engine);
      const registry = createRegistryManager({ repoRoot: resolveRepoRoot() });

      switch (action) {
        case 'list': {
          const plugins = engine.plugins.list();
          if (plugins.length === 0) {
            engine.prompts.info(t('plugin_no_loaded'));
            return;
          }
          for (const plugin of plugins) {
            console.log(
              `  ${plugin.plugin.name}@${plugin.plugin.version} ${plugin.enabled ? '' : '(disabled)'} — ${plugin.path}`,
            );
          }
          break;
        }
        case 'search': {
          const registryMode =
            (ctx.options.registry as 'local' | 'npm' | 'all' | undefined) ?? 'local';
          const result = await registry.search({ query: name, registry: registryMode });
          if (result.entries.length === 0) {
            engine.prompts.info(t('plugin_none_found'));
            return;
          }
          for (const plugin of result.entries) {
            const downloads = plugin.downloads ?? 0;
            const npm = plugin.npmPackage ? ` [npm: ${plugin.npmPackage}]` : '';
            console.log(
              `  ${plugin.name}@${plugin.version} — ${plugin.description ?? ''} (${downloads} downloads)${npm}`,
            );
          }
          engine.prompts.note(
            t('plugin_marketplace_found', {
              count: String(result.total),
              registry: registryMode,
            }),
            t('plugin_marketplace_title'),
          );
          break;
        }
        case 'create': {
          if (!name)
            throw new Error('Plugin name is required: my plugin create @mycli-cli/plugin-name');
          const pluginName = normalizePluginName(name);
          const slug = pluginName.replace(/^@[^/]+\//, '').replace(/^plugin-/, '');
          const outputDir = join(engine.app.cwd, 'plugins', 'community', slug);
          const result = await createPluginScaffold({
            name: pluginName,
            outputDir,
            dryRun,
          });
          engine.prompts.success(
            dryRun
              ? t('plugin_create_dry_run', { dir: outputDir })
              : t('plugin_create_success', { count: String(result.files.length) }),
          );
          console.log(`  npm package: ${npmPackageFromName(pluginName)}`);
          for (const file of result.files) {
            console.log(`  ✔ ${file}`);
          }
          break;
        }
        case 'install':
        case 'add': {
          if (!name) throw new Error('Plugin name is required');
          const source = ctx.options.from as 'local' | 'npm' | 'auto' | undefined;
          const result = await marketplace.install({ name, dryRun, source: source ?? 'auto' });
          engine.prompts.success(result.message);
          if (result.path) console.log(`  ✔ ${result.path}`);
          break;
        }
        case 'update': {
          if (!name) throw new Error('Plugin name is required');
          const result = await marketplace.update(name, dryRun);
          engine.prompts.success(result.message);
          break;
        }
        case 'remove':
        case 'uninstall': {
          if (!name) throw new Error('Plugin name is required');
          if (!dryRun) await marketplace.uninstall(name);
          engine.prompts.success(t('plugin_removed', { name }));
          break;
        }
        case 'publish': {
          if (!name) throw new Error('Plugin directory is required: my plugin publish <dir>');
          const result = await marketplace.publish({
            pluginDir: name,
            dryRun,
            publishToNpm: Boolean(ctx.options.npm),
          });
          engine.prompts.success(
            t('plugin_published', { name: result.entry.name, version: result.entry.version }),
          );
          console.log(`  ✔ ${result.communityPath}`);
          console.log(`  ✔ ${result.catalogPath}`);
          if (result.npmCommands?.length) {
            console.log('  npm:');
            for (const cmd of result.npmCommands) console.log(`    ${cmd}`);
          }
          break;
        }
        default:
          throw new Error(`Unknown plugin action: ${action}`);
      }
    },
  });
}
