import type { CliEngine } from '@mycli-cli/cli-engine';
import { defineCommand } from '@mycli-cli/command-engine';
import { createConfigManager } from '@mycli-cli/config-manager';
import {
  type GitProvider,
  createGitManager,
  listGitProviderAdapters,
} from '@mycli-cli/git-manager';
import { createGithubManager } from '@mycli-cli/github-manager';
import pc from 'picocolors';

const GIT_PROVIDERS = ['github', 'gitlab', 'bitbucket', 'azure-devops'] as const;

function resolveProvider(
  configured: string | undefined,
  option: string | undefined,
  fallback: GitProvider,
): GitProvider {
  return (option ?? configured ?? fallback) as GitProvider;
}

export function gitCommand(engine: CliEngine) {
  return defineCommand({
    name: 'git',
    description: 'Git provider automation — remote create, publish, and push',
    arguments: [
      { name: 'action', description: 'providers | remote | publish | push', required: false },
      { name: 'target', description: 'Sub-action (e.g. create for remote)', required: false },
    ],
    options: [
      {
        flags: '--provider <provider>',
        description: 'Git provider (github|gitlab|bitbucket|azure-devops)',
      },
      { flags: '--name <name>', description: 'Repository name' },
      { flags: '--owner <owner>', description: 'Repository owner / namespace' },
      { flags: '--org <organization>', description: 'Organization (Azure DevOps org URL or slug)' },
      { flags: '--project <project>', description: 'Azure DevOps project name' },
      { flags: '--private', description: 'Create private repository', defaultValue: false },
      { flags: '--branch <branch>', description: 'Branch name', defaultValue: 'main' },
      { flags: '--remote <name>', description: 'Git remote name', defaultValue: 'origin' },
      { flags: '--message <message>', description: 'Commit message for publish' },
      {
        flags: '--labels',
        description: 'Create GitHub labels after publish (GitHub only)',
        defaultValue: false,
      },
      { flags: '--dry-run', description: 'Preview without executing', defaultValue: false },
    ],
    examples: [
      'my git providers',
      'my git remote create --provider github --name my-app --dry-run',
      'my git publish --provider github --name my-app --dry-run',
      'my git push --branch main --dry-run',
    ],
    async handler(ctx) {
      const t = (key: string, params?: Record<string, string>) => engine.i18n.t(key, params);
      const action = (ctx.args.action as string | undefined) ?? 'providers';
      const target = ctx.args.target as string | undefined;
      const dryRun = Boolean(ctx.options.dryRun);
      const cwd = engine.app.cwd;

      const config = createConfigManager({ cwd });
      await config.load();
      const appName = config.get().projectName ?? 'app';

      const git = createGitManager({ cwd });

      if (action === 'providers') {
        engine.prompts.intro(t('git_providers_intro'));
        for (const adapter of listGitProviderAdapters()) {
          const available = await adapter.isAvailable();
          const icon = available ? pc.green('✔') : pc.yellow('○');
          const tools = adapter.cliTools.length > 0 ? adapter.cliTools.join(', ') : 'manual';
          console.log(`${icon} ${adapter.provider} (${tools})`);
        }
        engine.prompts.outro('Use my git remote create --provider <name> --dry-run to preview');
        return;
      }

      const provider = resolveProvider(
        config.get().gitProvider,
        ctx.options.provider as string | undefined,
        'github',
      );

      if (!GIT_PROVIDERS.includes(provider as (typeof GIT_PROVIDERS)[number])) {
        throw new Error(`Unsupported git provider: ${provider}`);
      }

      const repoName = (ctx.options.name as string | undefined) ?? appName;
      const branch = (ctx.options.branch as string | undefined) ?? 'main';

      if (action === 'remote' && target === 'create') {
        engine.prompts.intro(t('git_remote_intro'));
        const result = await git.createRemoteRepo({
          provider,
          name: repoName,
          cwd,
          private: Boolean(ctx.options.private),
          owner: ctx.options.owner as string | undefined,
          organization: ctx.options.org as string | undefined,
          project: ctx.options.project as string | undefined,
          branch,
          dryRun,
        });

        if (dryRun) {
          console.log(pc.dim('\nPlanned commands:'));
          for (const command of result.commands) {
            console.log(`  ${command}`);
          }
        } else if (result.message) {
          console.log(pc.green(result.message));
        }

        engine.prompts.outro(
          dryRun ? t('git_dry_run') : `Remote: ${result.url || result.remoteName}`,
        );
        return;
      }

      if (action === 'publish') {
        engine.prompts.intro(t('git_publish_intro'));
        const result = await git.publishToRemote({
          provider,
          name: repoName,
          cwd,
          private: Boolean(ctx.options.private),
          owner: ctx.options.owner as string | undefined,
          organization: ctx.options.org as string | undefined,
          project: ctx.options.project as string | undefined,
          branch,
          commitMessage: (ctx.options.message as string | undefined) ?? 'Initial commit',
          dryRun,
        });

        if (dryRun) {
          console.log(pc.dim('\nPlanned commands:'));
          for (const command of result.commands) {
            console.log(`  ${command}`);
          }
          if (Boolean(ctx.options.labels) && provider === 'github') {
            const github = createGithubManager({ cwd });
            const labels = await github.createLabels({ cwd, dryRun: true });
            for (const command of labels.commands) {
              console.log(`  ${command}`);
            }
          }
        } else if (result.message) {
          console.log(pc.green(result.message));
          if (
            Boolean(ctx.options.labels) &&
            provider === 'github' &&
            (result.executed || result.pushed)
          ) {
            const github = createGithubManager({ cwd });
            const labels = await github.createLabels({ cwd });
            console.log(pc.green(`Created ${labels.created} GitHub label(s)`));
          }
        }

        engine.prompts.outro(
          dryRun
            ? t('git_dry_run')
            : result.pushed
              ? t('git_publish_done')
              : t('git_publish_created'),
        );
        return;
      }

      if (action === 'push') {
        engine.prompts.intro(t('git_push_intro'));
        const remote = (ctx.options.remote as string | undefined) ?? 'origin';
        const commands = await git.push({ cwd, remote, branch, setUpstream: true, dryRun });
        if (dryRun) {
          console.log(pc.dim('\nPlanned commands:'));
          for (const command of commands) {
            console.log(`  ${command}`);
          }
        }
        engine.prompts.outro(dryRun ? t('git_dry_run') : `Pushed to ${remote}/${branch}`);
        return;
      }

      throw new Error(`Unknown git action: ${action}${target ? ` ${target}` : ''}`);
    },
  });
}
