import type { UpgradeContext, UpgradeMigration, UpgradeMigrationResult } from '../types.js';

async function writeIfMissing(
  context: UpgradeContext,
  path: string,
  content: string,
  created: string[],
  skipped: string[],
): Promise<void> {
  if (await context.fs.exists(path)) {
    if (context.force) {
      if (!context.dryRun) {
        await context.fs.write(path, content);
      }
      created.push(path);
      return;
    }
    skipped.push(path);
    return;
  }

  if (!context.dryRun) {
    await context.fs.write(path, content);
  }
  created.push(path);
}

export const UPGRADE_MIGRATIONS: UpgradeMigration[] = [
  {
    id: 'ensure-paths',
    description: 'Ensure standard paths exist in .myclirc.json',
    async run(context): Promise<UpgradeMigrationResult> {
      const current = context.config.get();
      context.config.mergeIn({
        version: context.targetVersion,
        paths: {
          modules: current.paths?.modules ?? 'src/modules',
          templates: current.paths?.templates ?? 'templates',
          plugins: current.paths?.plugins ?? 'plugins',
          output: current.paths?.output ?? '.',
        },
      });
      if (!context.dryRun) {
        await context.config.save();
      }
      return {
        id: 'ensure-paths',
        description: 'Ensure standard paths exist in .myclirc.json',
        applied: true,
        created: ['.myclirc.json'],
        skipped: [],
      };
    },
  },
  {
    id: 'ensure-environment-md',
    description: 'Add ENVIRONMENT.md when missing',
    async run(context): Promise<UpgradeMigrationResult> {
      const created: string[] = [];
      const skipped: string[] = [];
      const content = `# Environment

Document required and optional variables here.

Never commit \`.env\`.
`;
      await writeIfMissing(context, 'ENVIRONMENT.md', content, created, skipped);
      return {
        id: 'ensure-environment-md',
        description: 'Add ENVIRONMENT.md when missing',
        applied: created.length > 0,
        created,
        skipped,
      };
    },
  },
  {
    id: 'ensure-biome-json',
    description: 'Add biome.json when missing',
    async run(context): Promise<UpgradeMigrationResult> {
      const created: string[] = [];
      const skipped: string[] = [];
      const content =
        context.templates && !context.dryRun
          ? await context.templates.renderFile('features/quality/biome.json.ejs', { data: {} })
          : `{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "linter": { "enabled": true, "rules": { "recommended": true } },
  "formatter": { "enabled": true }
}
`;
      await writeIfMissing(context, 'biome.json', content, created, skipped);
      return {
        id: 'ensure-biome-json',
        description: 'Add biome.json when missing',
        applied: created.length > 0,
        created,
        skipped,
      };
    },
  },
  {
    id: 'ensure-editorconfig',
    description: 'Add .editorconfig when missing',
    async run(context): Promise<UpgradeMigrationResult> {
      const created: string[] = [];
      const skipped: string[] = [];
      const content = `root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
`;
      await writeIfMissing(context, '.editorconfig', content, created, skipped);
      return {
        id: 'ensure-editorconfig',
        description: 'Add .editorconfig when missing',
        applied: created.length > 0,
        created,
        skipped,
      };
    },
  },
];

export function listUpgradeMigrations(): UpgradeMigration[] {
  return UPGRADE_MIGRATIONS;
}
