import type { CliEngine } from '@mycli-cli/cli-engine';
import { defineCommand } from '@mycli-cli/command-engine';
import { createConfigManager } from '@mycli-cli/config-manager';
import { createDependencyManager } from '@mycli-cli/dependency-manager';
import { createFileSystem } from '@mycli-cli/filesystem';
import { createSecurityManager } from '@mycli-cli/security-engine';
import pc from 'picocolors';
import { resolveTemplatesRoot } from '../paths.js';
import { runDependencyAudit, scanSecrets } from '../utils/health-checks.js';
import { formatSecretFindings, listProjectFiles, readProjectFile } from '../utils/secret-scan.js';

async function installDeps(
  cwd: string,
  deps: Record<string, string>,
  devDeps: Record<string, string>,
  dryRun: boolean,
): Promise<void> {
  if (dryRun) return;
  const names = [...Object.keys(deps), ...Object.keys(devDeps)];
  if (names.length === 0) return;
  const fs = createFileSystem(cwd);
  if (!(await fs.exists('package.json'))) return;
  const dm = createDependencyManager({ cwd });
  await dm.updatePackageJson((pkg) => {
    const dependencies = (pkg.dependencies as Record<string, string> | undefined) ?? {};
    const devDependencies = (pkg.devDependencies as Record<string, string> | undefined) ?? {};
    Object.assign(dependencies, deps);
    Object.assign(devDependencies, devDeps);
    pkg.dependencies = dependencies;
    pkg.devDependencies = devDependencies;
    return pkg;
  }, cwd);
}

export function securityCommand(engine: CliEngine) {
  return defineCommand({
    name: 'security',
    description: 'Enterprise security setup, scan, dependency audit, and secret scanning',
    arguments: [
      {
        name: 'action',
        description: 'setup | scan | audit | scan-secrets',
        required: false,
      },
    ],
    options: [
      { flags: '--dry-run', description: 'Preview without writing files', defaultValue: false },
      {
        flags: '--output <file>',
        description: 'Security scan report path',
        defaultValue: 'security-report.md',
      },
    ],
    examples: [
      'my security setup',
      'my security scan',
      'my security audit',
      'my security scan-secrets',
      'my security setup --dry-run',
    ],
    async handler(ctx) {
      const t = (key: string, params?: Record<string, string>) => engine.i18n.t(key, params);
      const action = (ctx.args.action as string | undefined) ?? 'setup';
      const cwd = engine.app.cwd;
      const dryRun = Boolean(ctx.options.dryRun);

      if (action === 'audit') {
        engine.prompts.intro(t('security_audit_intro'));
        const audit = await runDependencyAudit(cwd);
        const icon = audit.ok ? pc.green('✔') : pc.yellow('⚠');
        console.log(`${icon} ${audit.message}`);
        engine.prompts.outro(audit.ok ? t('security_audit_pass') : t('security_audit_review'));
        return;
      }

      if (action === 'scan-secrets') {
        engine.prompts.intro(t('security_scan_intro'));
        const findings = await scanSecrets(
          cwd,
          (path) => readProjectFile(cwd, path),
          () => listProjectFiles(cwd),
        );
        if (findings.length === 0) {
          engine.prompts.success(t('security_no_secrets'));
        } else {
          console.log(formatSecretFindings(findings));
          engine.prompts.warn(
            `${findings.length} potential secret(s) found — review and rotate if real`,
          );
        }
        engine.prompts.outro(t('security_scan_complete'));
        return;
      }

      const templatesRoot = resolveTemplatesRoot();
      const config = createConfigManager({ cwd });
      await config.load();
      const fs = createFileSystem(cwd);
      const projectName = config.get().projectName ?? 'app';
      const security = createSecurityManager({ cwd, filesystem: fs, templatesRoot });

      if (action === 'scan') {
        engine.prompts.intro(t('security_full_scan_intro'));
        const outputFile = (ctx.options.output as string | undefined) ?? 'security-report.md';
        const result = await security.scan({
          cwd,
          projectName,
          outputFile,
          dryRun,
        });
        if (dryRun) {
          engine.prompts.info(
            t('security_scan_dry_run', {
              file: result.reportPath,
              count: String(result.findingCount),
            }),
          );
        } else {
          engine.prompts.success(
            t('security_scan_report_done', {
              file: result.reportPath,
              count: String(result.findingCount),
            }),
          );
        }
        engine.prompts.outro(t('security_full_scan_complete'));
        return;
      }

      if (action !== 'setup') {
        throw new Error(
          `Unknown security action: ${action}. Use setup, scan, audit, or scan-secrets.`,
        );
      }

      const language = config.get().generators?.language ?? config.get().language ?? 'typescript';
      const pathConfig = config.get().paths as { security?: string };
      const result = await security.setup({
        appName: projectName,
        paths: pathConfig,
        language: language === 'javascript' ? 'javascript' : 'typescript',
        dryRun,
      });

      await installDeps(cwd, result.dependencies, result.devDependencies, dryRun);
      config.enableFeature('security');
      if (!dryRun) {
        config.set('paths', {
          ...config.get().paths,
          security: pathConfig.security ?? 'src/security',
        });
        await config.save();
      }

      engine.prompts.success(
        t('add_security_done', {
          count: String(result.files.length),
        }),
      );
    },
  });
}
