import type { CliEngine } from '@mycli-cli/cli-engine';
import { type CloudProvider, createCloudManager } from '@mycli-cli/cloud-manager';
import { defineCommand } from '@mycli-cli/command-engine';
import { createConfigManager } from '@mycli-cli/config-manager';
import { createDeploymentManager } from '@mycli-cli/deployment-manager';
import { createFileSystem } from '@mycli-cli/filesystem';
import { createSecretsManager } from '@mycli-cli/secrets-manager';
import { resolveTemplatesRoot } from '../paths.js';

const CLOUD_PROVIDERS = [
  'aws',
  'azure',
  'gcp',
  'digitalocean',
  'railway',
  'render',
  'fly',
  'vercel',
  'netlify',
] as const;

function resolveProvider(
  configured: string | undefined,
  option: string | undefined,
  fallback: string,
): string {
  return option ?? configured ?? fallback;
}

export function deployCommand(engine: CliEngine) {
  return defineCommand({
    name: 'deploy',
    description: 'Cloud deployment — setup, push, status, logs, secrets',
    arguments: [
      {
        name: 'action',
        description: 'setup | terraform | push | status | logs | rollback | destroy | secrets',
        required: false,
      },
      { name: 'target', description: 'Sub-action (e.g. sync for secrets)', required: false },
    ],
    options: [
      { flags: '--provider <provider>', description: 'Cloud deployment provider' },
      { flags: '--region <region>', description: 'Cloud region' },
      { flags: '--env <environment>', description: 'Deployment environment (production|staging)' },
      { flags: '--env-file <path>', description: 'Env file for secrets sync' },
      { flags: '--dry-run', description: 'Preview without executing', defaultValue: false },
      { flags: '--yes', description: 'Skip destroy confirmation', defaultValue: false },
    ],
    examples: [
      'my deploy setup --provider railway',
      'my deploy terraform --provider aws',
      'my deploy push --provider fly',
      'my deploy status --provider railway',
      'my deploy logs --provider fly',
      'my deploy secrets sync --provider railway --dry-run',
      'my deploy rollback --provider fly --dry-run',
      'my deploy destroy --provider aws --dry-run',
    ],
    async handler(ctx) {
      const t = (key: string, params?: Record<string, string>) => engine.i18n.t(key, params);
      const action = (ctx.args.action as string | undefined) ?? 'setup';
      const target = ctx.args.target as string | undefined;
      const dryRun = Boolean(ctx.options.dryRun);
      const templatesRoot = resolveTemplatesRoot();
      const cwd = engine.app.cwd;

      const config = createConfigManager({ cwd });
      await config.load();
      const appName = config.get().projectName ?? 'app';
      const fs = createFileSystem(cwd);

      const deployments = createDeploymentManager({ cwd, filesystem: fs, templatesRoot });
      const cloud = createCloudManager({ cwd, filesystem: fs, templatesRoot });
      const secrets = createSecretsManager({ cwd, filesystem: fs, templatesRoot });

      const provider = resolveProvider(
        config.get().deployProvider ?? config.get().terraformProvider,
        ctx.options.provider as string | undefined,
        'railway',
      ) as CloudProvider;

      const environment = (ctx.options.env as string | undefined) ?? 'production';

      if (action === 'terraform') {
        const tfProvider =
          (ctx.options.provider as string | undefined) ??
          (engine.app.interactive
            ? await engine.prompts.select({
                message: t('deploy_terraform_provider'),
                options: [
                  { value: 'aws', label: 'AWS (ECS Fargate)' },
                  { value: 'gcp', label: 'Google Cloud Run' },
                  { value: 'azure', label: 'Azure Container Apps' },
                ],
              })
            : 'aws');

        const result = await deployments.setupTerraform({
          provider: tfProvider as 'aws' | 'gcp' | 'azure',
          appName,
          region: ctx.options.region as string | undefined,
          dryRun,
        });

        if (!dryRun) {
          await cloud.setupDocs({
            provider: tfProvider as CloudProvider,
            appName,
            environment,
          });
          config.enableFeature('terraform');
          config.set('terraformProvider', tfProvider);
          await config.save();
        }

        engine.prompts.success(t('deploy_terraform_done', { provider: tfProvider }));
        for (const file of result.files) {
          console.log(`  ✔ ${file}`);
        }
        return;
      }

      if (action === 'setup') {
        const setupProvider =
          (ctx.options.provider as string | undefined) ??
          (engine.app.interactive
            ? await engine.prompts.select({
                message: t('deploy_provider'),
                options: CLOUD_PROVIDERS.map((p) => ({
                  value: p,
                  label: p.charAt(0).toUpperCase() + p.slice(1),
                })),
              })
            : 'railway');

        const result = await deployments.setup({
          provider: setupProvider as 'railway',
          appName,
          region: ctx.options.region as string | undefined,
          dryRun,
        });

        if (!dryRun) {
          const docs = await cloud.setupDocs({
            provider: setupProvider as CloudProvider,
            appName,
            environment,
          });
          for (const file of docs.files) {
            result.files.push(file);
          }
          config.enableFeature('deploy');
          config.set('deployProvider', setupProvider);
          await config.save();
        }

        engine.prompts.success(t('deploy_setup_done', { provider: setupProvider }));
        for (const file of result.files) {
          console.log(`  ✔ ${file}`);
        }
        return;
      }

      if (action === 'push') {
        const validation = await cloud.validate(provider, cwd);
        if (!validation.ready && !dryRun) {
          engine.prompts.error(validation.message);
          for (const file of validation.missingFiles) {
            console.log(`  ✖ missing file: ${file}`);
          }
          throw new Error('Deployment not ready. Run: my deploy setup');
        }

        const result = await cloud.push({
          provider,
          appName,
          environment,
          region: ctx.options.region as string | undefined,
          dryRun,
        });

        if (result.success) {
          engine.prompts.success(result.message);
        } else {
          engine.prompts.error(result.message);
        }
        for (const cmd of result.commands) {
          console.log(`  $ ${cmd}`);
        }
        if (result.url) console.log(`  → ${result.url}`);
        return;
      }

      if (action === 'status') {
        const result = await cloud.status({ provider, appName, cwd });
        engine.prompts.note(result.message, `${provider} status (${result.status})`);
        if (result.url) console.log(`  URL: ${result.url}`);
        return;
      }

      if (action === 'logs') {
        const result = await cloud.logs({ provider, appName, cwd });
        engine.prompts.intro(t('deploy_logs_intro', { provider }));
        for (const line of result.lines) {
          if (line.trim()) console.log(line);
        }
        return;
      }

      if (action === 'rollback') {
        const result = await cloud.rollback({
          provider,
          appName,
          environment,
          dryRun,
        });
        engine.prompts.note(result.message, 'Rollback');
        for (const cmd of result.commands) {
          console.log(`  $ ${cmd}`);
        }
        return;
      }

      if (action === 'destroy') {
        if (!dryRun && !ctx.options.yes) {
          const confirmed = engine.app.interactive
            ? await engine.prompts.confirm({
                message: t('deploy_destroy_confirm', { provider, app: appName }),
                initialValue: false,
              })
            : false;
          if (!confirmed) {
            engine.prompts.note(t('deploy_destroy_aborted'), t('deploy_destroy_aborted_title'));
            return;
          }
        }
        const result = await cloud.destroy({
          provider,
          appName,
          environment,
          dryRun,
        });
        if (result.success) {
          engine.prompts.success(result.message);
        } else {
          engine.prompts.error(result.message);
        }
        for (const cmd of result.commands) {
          console.log(`  $ ${cmd}`);
        }
        return;
      }

      if (action === 'secrets') {
        if (target !== 'sync') {
          throw new Error('Usage: my deploy secrets sync [--provider <provider>] [--dry-run]');
        }
        const result = await secrets.sync({
          provider: provider as CloudProvider,
          appName,
          environment,
          envFile: (ctx.options.envFile as string | undefined) ?? '.env',
          dryRun,
        });
        engine.prompts.success(result.message);
        console.log(
          `  Syncing ${result.synced.length} secrets (skipped: ${result.skipped.join(', ') || 'none'})`,
        );
        for (const cmd of result.commands) {
          console.log(`  $ ${cmd}`);
        }
        return;
      }

      throw new Error(
        `Unknown deploy action: ${action}. Use: setup | terraform | push | status | logs | rollback | destroy | secrets sync`,
      );
    },
  });
}
