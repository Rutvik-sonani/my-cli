import { createConfigManager } from '@mycli-cli/config-manager';
import { type FileSystem, createFileSystem } from '@mycli-cli/filesystem';
import { createTemplateEngine } from '@mycli-cli/template-engine';
import { listUpgradeMigrations } from './migrations/index.js';
import type { UpgradeRunOptions, UpgradeRunResult, UpgradeState } from './types.js';

const STATE_DIR = '.mycli';
const STATE_FILE = '.mycli/upgrade-state.json';

export class UpgradeManager {
  private readonly cwd: string;

  constructor(options: { cwd?: string } = {}) {
    this.cwd = options.cwd ?? process.cwd();
  }

  async loadState(fs: FileSystem): Promise<UpgradeState> {
    if (!(await fs.exists(STATE_FILE))) {
      return { applied: [], version: '0.0.0' };
    }
    return fs.readJson<UpgradeState>(STATE_FILE);
  }

  async saveState(fs: FileSystem, state: UpgradeState, dryRun: boolean): Promise<void> {
    if (dryRun) return;
    await fs.ensureDir(STATE_DIR);
    await fs.writeJson(STATE_FILE, state, { overwrite: true });
  }

  async run(options: UpgradeRunOptions = {}): Promise<UpgradeRunResult> {
    const cwd = options.cwd ?? this.cwd;
    const fs = createFileSystem(cwd);
    const config = createConfigManager({ cwd, filesystem: fs });
    await config.load();

    const fromVersion = config.get().version ?? '0.0.0';
    const toVersion = options.targetVersion ?? '1.1.0';
    const state = await this.loadState(fs);
    const templates = options.templatesRoot
      ? createTemplateEngine({ filesystem: fs, templatesRoot: options.templatesRoot })
      : undefined;

    const migrations = listUpgradeMigrations();
    const results = [];

    for (const migration of migrations) {
      if (state.applied.includes(migration.id)) {
        results.push({
          id: migration.id,
          description: migration.description,
          applied: false,
          created: [],
          skipped: ['already-applied'],
        });
        continue;
      }

      const result = await migration.run({
        cwd,
        fs,
        config,
        templates,
        dryRun: Boolean(options.dryRun),
        force: Boolean(options.force),
        targetVersion: toVersion,
      });
      results.push(result);

      if (result.applied && !options.dryRun) {
        state.applied.push(migration.id);
      }
    }

    state.version = toVersion;
    await this.saveState(fs, state, Boolean(options.dryRun));

    if (!options.dryRun && fromVersion !== toVersion) {
      config.mergeIn({ version: toVersion });
      await config.save();
    }

    return { fromVersion, toVersion, migrations: results };
  }
}

export function createUpgradeManager(options?: { cwd?: string }): UpgradeManager {
  return new UpgradeManager(options);
}

export type {
  UpgradeContext,
  UpgradeMigration,
  UpgradeMigrationResult,
  UpgradeRunOptions,
  UpgradeRunResult,
  UpgradeState,
} from './types.js';
export { listUpgradeMigrations, UPGRADE_MIGRATIONS } from './migrations/index.js';
