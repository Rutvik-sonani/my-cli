import type { CliEngine } from '@mycli/cli-engine';
import type { CommandDefinition } from '@mycli/command-engine';
import { addCommand } from './add.js';
import { aiCommand } from './ai.js';
import { analyticsCommand } from './analytics.js';
import { architectureCommand } from './architecture.js';
import { backupCommand } from './backup.js';
import { createCommand } from './create.js';
import { deployCommand } from './deploy.js';
import { docsCommand } from './docs.js';
import { doctorCommand } from './doctor.js';
import { gitCommand } from './git.js';
import { governanceCommand } from './governance.js';
import { makeCommand } from './make.js';
import { organizationCommand } from './organization.js';
import { permissionCommand } from './permission.js';
import { pluginCommand } from './plugin.js';
import { privacyCommand } from './privacy.js';
import { rbacCommand } from './rbac.js';
import { roleCommand } from './role.js';
import { securityCommand } from './security.js';
import { templateCommand } from './template.js';
import { upgradeCommand } from './upgrade.js';
import { buildCommand, devCommand, lintCommand, testCommand } from './workflow.js';

export function createCommands(engine: CliEngine): CommandDefinition[] {
  return [
    createCommand(engine),
    makeCommand(engine),
    addCommand(engine),
    pluginCommand(engine),
    doctorCommand(engine),
    upgradeCommand(engine),
    deployCommand(engine),
    analyticsCommand(engine),
    roleCommand(engine),
    permissionCommand(engine),
    devCommand(engine),
    testCommand(engine),
    lintCommand(engine),
    buildCommand(engine),
    gitCommand(engine),
    securityCommand(engine),
    aiCommand(engine),
    backupCommand(engine),
    privacyCommand(engine),
    organizationCommand(engine),
    governanceCommand(engine),
    templateCommand(engine),
    docsCommand(engine),
    rbacCommand(engine),
    architectureCommand(engine),
  ];
}
