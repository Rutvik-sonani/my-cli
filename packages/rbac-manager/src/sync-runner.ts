import type { FileSystem } from '@mycli-cli/filesystem';
import { execa } from 'execa';

export interface SyncRbacOptions {
  cwd?: string;
  dryRun?: boolean;
  filesystem: FileSystem;
}

/**
 * Runs the generated `.mycli/sync-rbac.ts` script in the target project.
 */
export async function runRbacDatabaseSync(options: SyncRbacOptions): Promise<string[]> {
  const cwd = options.cwd ?? options.filesystem.getRoot();
  const scriptPath = '.mycli/sync-rbac.ts';
  const commands: string[] = [];

  if (!(await options.filesystem.exists(scriptPath))) {
    throw Object.assign(new Error('Missing .mycli/sync-rbac.ts — run `my add rbac` first.'), {
      status: 404,
    });
  }

  if (!(await options.filesystem.exists('.mycli/rbac.json'))) {
    throw Object.assign(new Error('Missing .mycli/rbac.json RBAC store.'), { status: 404 });
  }

  const command = 'pnpm exec tsx .mycli/sync-rbac.ts';
  commands.push(command);

  if (!options.dryRun) {
    const result = await execa('pnpm', ['exec', 'tsx', scriptPath], {
      cwd,
      reject: false,
    });
    if (result.exitCode !== 0) {
      const detail = result.stderr?.trim() || result.stdout?.trim() || 'RBAC sync failed';
      throw Object.assign(new Error(detail), { status: result.exitCode ?? 1 });
    }
  }

  return commands;
}
