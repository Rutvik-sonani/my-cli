import { createConfigManager } from '@mycli/config-manager';
import { createFileSystem } from '@mycli/filesystem';
import type { RbacManager } from '@mycli/rbac-manager';

export async function syncRbacStoreToDatabase(
  cwd: string,
  rbac: RbacManager,
  dryRun: boolean,
): Promise<{ ok: boolean; message?: string }> {
  const config = createConfigManager({ cwd });
  await config.load();
  if ((config.get().orm ?? 'prisma') !== 'prisma') {
    return { ok: false, message: 'Prisma ORM required for database sync' };
  }
  const fs = createFileSystem(cwd);
  if (!(await fs.exists('.mycli/sync-rbac.ts'))) {
    return { ok: false, message: 'Run my add rbac to generate sync script' };
  }
  try {
    await rbac.syncToDatabase({ dryRun });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, message };
  }
}
