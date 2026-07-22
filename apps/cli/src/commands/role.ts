import type { CliEngine } from '@mycli/cli-engine';
import { defineCommand } from '@mycli/command-engine';
import { createFileSystem } from '@mycli/filesystem';
import { createRbacManager } from '@mycli/rbac-manager';
import { resolveTemplatesRoot } from '../paths.js';
import { syncRbacStoreToDatabase } from '../utils/rbac-sync.js';

export function roleCommand(engine: CliEngine) {
  return defineCommand({
    name: 'role',
    description: 'Manage RBAC roles',
    arguments: [
      { name: 'action', description: 'create | assign | list', required: true },
      { name: 'name', description: 'Role name or user id', required: false },
    ],
    options: [
      { flags: '--description', description: 'Role description' },
      { flags: '--role', description: 'Role name for assign action' },
      { flags: '--dry-run', description: 'Preview without writing', defaultValue: false },
    ],
    examples: ['my role create admin', 'my role assign user-1 admin --role admin', 'my role list'],
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
          engine.prompts.error(t('role_name_required'));
          throw new Error('Missing role name');
        }
        if (!dryRun) {
          await rbac.createRole(name, ctx.options.description as string | undefined);
          const sync = await syncRbacStoreToDatabase(engine.app.cwd, rbac, false);
          if (!sync.ok && sync.message) {
            engine.prompts.warn(t('rbac_store_local_warn', { message: sync.message }));
          }
        }
        engine.prompts.success(t('role_created', { name }));
        return;
      }

      if (action === 'assign') {
        const userId = ctx.args.name as string | undefined;
        const roleName = ctx.options.role as string | undefined;
        if (!userId || !roleName) {
          engine.prompts.error(t('role_assign_usage'));
          throw new Error('Missing userId or role');
        }
        if (!dryRun) {
          await rbac.assignRole(userId, roleName);
          const sync = await syncRbacStoreToDatabase(engine.app.cwd, rbac, false);
          if (!sync.ok && sync.message) {
            engine.prompts.warn(t('rbac_store_local_warn', { message: sync.message }));
          }
        }
        engine.prompts.success(t('role_assigned', { role: roleName, user: userId }));
        return;
      }

      if (action === 'list') {
        const roles = dryRun ? [] : await rbac.listRoles();
        if (roles.length === 0) {
          engine.prompts.note(t('role_list_empty'), t('role_list_title'));
        } else {
          for (const role of roles) {
            engine.prompts.info(`${role.name}${role.description ? ` — ${role.description}` : ''}`);
          }
        }
        return;
      }

      engine.prompts.error(`Unknown action: ${action}`);
      throw new Error(`Unknown role action: ${action}`);
    },
  });
}
