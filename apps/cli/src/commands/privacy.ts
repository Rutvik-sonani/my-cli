import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CliEngine } from '@mycli-cli/cli-engine';
import { defineCommand } from '@mycli-cli/command-engine';
import { createConfigManager } from '@mycli-cli/config-manager';
import { InMemoryPrivacyUserStore, createPrivacyService } from '@mycli-cli/privacy-engine';

async function loadSeedProfiles(cwd: string): Promise<Map<string, Record<string, unknown>>> {
  const seedPath = join(cwd, 'data', 'privacy-users.json');
  try {
    const raw = await readFile(seedPath, 'utf8');
    const parsed = JSON.parse(raw) as Record<string, Record<string, unknown>>;
    return new Map(Object.entries(parsed));
  } catch {
    return new Map();
  }
}

async function saveSeedProfiles(
  cwd: string,
  profiles: Map<string, Record<string, unknown>>,
): Promise<void> {
  const seedPath = join(cwd, 'data', 'privacy-users.json');
  await mkdir(join(cwd, 'data'), { recursive: true });
  const obj = Object.fromEntries(profiles.entries());
  await writeFile(seedPath, `${JSON.stringify(obj, null, 2)}\n`, 'utf8');
}

export function privacyCommand(engine: CliEngine) {
  return defineCommand({
    name: 'privacy',
    description: 'Privacy subject-access export and erasure',
    arguments: [{ name: 'action', description: 'export | delete', required: true }],
    options: [
      { flags: '--user <id>', description: 'User id to export or delete' },
      {
        flags: '--output <dir>',
        description: 'Export output directory',
        defaultValue: './data/privacy-exports',
      },
      {
        flags: '--dry-run',
        description: 'Preview without writing or deleting',
        defaultValue: false,
      },
    ],
    examples: [
      'my privacy export --user user-1',
      'my privacy delete --user user-1',
      'my privacy export --user user-1 --output ./exports',
    ],
    async handler(ctx) {
      const t = (key: string, params?: Record<string, string>) => engine.i18n.t(key, params);
      const action = ctx.args.action as string;
      const userId = ctx.options.user as string | undefined;
      const dryRun = Boolean(ctx.options.dryRun);
      const outputDir = (ctx.options.output as string | undefined) ?? './data/privacy-exports';
      const cwd = engine.app.cwd;

      if (!userId) {
        throw new Error('Missing required option: --user <id>');
      }

      const config = createConfigManager({ cwd });
      await config.load();
      if (!config.get().features?.privacy) {
        engine.prompts.warn(t('privacy_not_enabled'));
      }

      const profiles = await loadSeedProfiles(cwd);
      const userStore = new InMemoryPrivacyUserStore();
      for (const [id, profile] of profiles) {
        userStore.setProfile(id, profile);
      }
      if (!profiles.has(userId)) {
        userStore.setProfile(userId, { userId });
        profiles.set(userId, { userId });
      }

      const service = createPrivacyService({ userStore });

      if (action === 'export') {
        if (dryRun) {
          engine.prompts.info(t('privacy_export_dry_run', { user: userId, dir: outputDir }));
          return;
        }
        const { filePath, export: data } = await service.exportUserDataToFile(userId, outputDir);
        await saveSeedProfiles(cwd, profiles);
        engine.prompts.success(
          t('privacy_export_done', {
            user: userId,
            file: filePath,
            consents: String(data.consents.length),
          }),
        );
        return;
      }

      if (action === 'delete') {
        if (dryRun) {
          engine.prompts.info(t('privacy_delete_dry_run', { user: userId }));
          return;
        }
        const result = await service.deleteUserData(userId);
        profiles.delete(userId);
        await saveSeedProfiles(cwd, profiles);
        engine.prompts.success(
          t('privacy_delete_done', {
            user: userId,
            consents: String(result.removedConsents),
            cookies: String(result.removedCookies),
          }),
        );
        return;
      }

      throw new Error(`Unknown privacy action: ${action}. Use: export, delete`);
    },
  });
}
