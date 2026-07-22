import type { CliEngine } from '@mycli/cli-engine';
import { defineCommand } from '@mycli/command-engine';
import { createFileSystem } from '@mycli/filesystem';
import { createRbacManager } from '@mycli/rbac-manager';
import { resolveTemplatesRoot } from '../paths.js';
import { syncRbacStoreToDatabase } from '../utils/rbac-sync.js';

export function permissionCommand(engine: CliEngine) {
  return defineCommand({
    name: 'permission',
    description: 'Manage RBAC permissions',
    arguments: [
      { name: 'action', description: 'create | assign | list', required: true },
      { name: 'name', description: 'Permission or role name', required: false },
    ],
    options: [
      { flags: '--description', description: 'Permission description' },
      { flags: '--permission', description: 'Permission name for assign action' },
      { flags: '--dry-run', description: 'Preview without writing', defaultValue: false },
    ],
    examples: [
      'my permission create user.read',
      'my permission assign admin user.read --permission user.read',
      'my permission list',
    ],
    async handler(ctx) {
      const t = (key: string, params?: Record<string, string>) => engine.i18n.t(key, params);
      const action = String(ctx.args.action).toLowerCase();
      const fs = createFileSystem(engine.app.cwd);
      const rbac = createRbacManager({
        cwd: engine.app.cwd,
        filesystem: fs,
        templatesRoot: resolveTemplatesRoot(),
      });
      const dryRun = Boolean(ctx.options.dryRun);

      if (action === 'create') {
        const name = ctx.args.name as string | undefined;
        if (!name) {
          engine.prompts.error(t('permission_name_required'));
          throw new Error('Missing permission name');
        }
        if (!dryRun) {
          await rbac.createPermission(name, ctx.options.description as string | undefined);
          const sync = await syncRbacStoreToDatabase(engine.app.cwd, rbac, false);
          if (!sync.ok && sync.message) {
            engine.prompts.warn(t('rbac_store_local_warn', { message: sync.message }));
          }
        }
        engine.prompts.success(t('permission_created', { name }));
        return;
      }

      if (action === 'assign') {
        const roleName = ctx.args.name as string | undefined;
        const permissionName = ctx.options.permission as string | undefined;
        if (!roleName || !permissionName) {
          engine.prompts.error(t('permission_assign_usage'));
          throw new Error('Missing role or permission');
        }
        if (!dryRun) {
          await rbac.assignPermission(roleName, permissionName);
          const sync = await syncRbacStoreToDatabase(engine.app.cwd, rbac, false);
          if (!sync.ok && sync.message) {
            engine.prompts.warn(t('rbac_store_local_warn', { message: sync.message }));
          }
        }
        engine.prompts.success(
          t('permission_assigned', { permission: permissionName, role: roleName }),
        );
        return;
      }

      if (action === 'list') {
        const permissions = dryRun ? [] : await rbac.listPermissions();
        if (permissions.length === 0) {
          engine.prompts.note(t('permission_list_empty'), t('permission_list_title'));
        } else {
          for (const permission of permissions) {
            engine.prompts.info(
              `${permission.name}${permission.description ? ` — ${permission.description}` : ''}`,
            );
          }
        }
        return;
      }

      engine.prompts.error(`Unknown action: ${action}`);
      throw new Error(`Unknown permission action: ${action}`);
    },
  });
}
