import type { CliEngine } from '@mycli-cli/cli-engine';
import { defineCommand } from '@mycli-cli/command-engine';
import { createConfigManager } from '@mycli-cli/config-manager';
import { createDependencyManager } from '@mycli-cli/dependency-manager';
import { createFileSystem } from '@mycli-cli/filesystem';
import { createGitManager } from '@mycli-cli/git-manager';
import { createProjectHealthManager } from '@mycli-cli/project-health-engine';
import { execa } from 'execa';
import pc from 'picocolors';
import { resolveTemplatesRoot } from '../paths.js';
import { pingDatabase, runDependencyAudit } from '../utils/health-checks.js';

interface CheckResult {
  name: string;
  ok: boolean;
  message: string;
}

export function doctorCommand(engine: CliEngine) {
  return defineCommand({
    name: 'doctor',
    description:
      'Enterprise project analysis — environment checks plus architecture, security, testing, and deployment health',
    arguments: [{ name: 'action', description: 'run (default) | setup', required: false }],
    options: [
      {
        flags: '--skip-audit',
        description: 'Skip dependency vulnerability audit',
        defaultValue: false,
      },
      {
        flags: '--dry-run',
        description: 'Analyze without writing project-health-report.md',
        defaultValue: false,
      },
      {
        flags: '--skip-report',
        description: 'Skip writing project-health-report.md',
        defaultValue: false,
      },
    ],
    examples: ['my doctor', 'my doctor setup', 'my doctor --skip-audit', 'my doctor --dry-run'],
    async handler(ctx) {
      const t = (key: string, params?: Record<string, string>) => engine.i18n.t(key, params);
      const action = (ctx.args.action as string | undefined) ?? 'run';
      const dryRun = Boolean(ctx.options.dryRun);
      const skipReport = Boolean(ctx.options.skipReport);
      const cwd = engine.app.cwd;
      const templatesRoot = resolveTemplatesRoot();

      const config = createConfigManager({ cwd });
      await config.load();
      const fs = createFileSystem(cwd);
      const projectName = config.get().projectName ?? 'app';
      const language = config.get().generators?.language ?? config.get().language ?? 'typescript';
      const pathConfig = config.get().paths as { projectHealth?: string };

      const health = createProjectHealthManager({ cwd, filesystem: fs, templatesRoot });

      if (action === 'setup') {
        const result = await health.setup({
          appName: projectName,
          paths: pathConfig,
          language: language === 'javascript' ? 'javascript' : 'typescript',
          dryRun,
        });
        config.enableFeature('projectHealth');
        if (!dryRun) {
          config.set('paths', {
            ...config.get().paths,
            projectHealth: pathConfig.projectHealth ?? 'src/project-health',
          });
          await config.save();
        }
        engine.prompts.success(t('doctor_setup_done', { count: String(result.files.length) }));
        return;
      }

      if (action !== 'run') {
        throw new Error(`Unknown doctor action: ${action}. Use: run | setup`);
      }

      engine.prompts.intro(t('doctor_intro'));
      const checks: CheckResult[] = [];

      const nodeMajor = Number(process.versions.node.split('.')[0]);
      checks.push({
        name: 'Node.js',
        ok: nodeMajor >= 22,
        message: `Node ${process.version} (requires >=22)`,
      });

      const deps = createDependencyManager({ cwd });
      try {
        const detected = await deps.detect();
        checks.push({
          name: 'Package manager',
          ok: true,
          message: `${detected.manager}${detected.lockfile ? ` (${detected.lockfile})` : ''}`,
        });
      } catch {
        checks.push({ name: 'Package manager', ok: false, message: 'No package manager detected' });
      }

      const git = createGitManager({ cwd });
      checks.push({
        name: 'Git',
        ok: await git.isAvailable(),
        message: (await git.isAvailable()) ? 'Git available' : 'Git not installed',
      });

      const docker = await execa('docker', ['--version'], { reject: false });
      checks.push({
        name: 'Docker',
        ok: docker.exitCode === 0,
        message: docker.exitCode === 0 ? docker.stdout.trim() : 'Docker unavailable',
      });

      checks.push({
        name: 'package.json',
        ok: await fs.exists('package.json'),
        message: (await fs.exists('package.json')) ? 'Found' : 'Missing',
      });

      const hasEnvExample = await fs.exists('.env.example');
      const hasEnv = await fs.exists('.env');
      checks.push({
        name: 'Environment',
        ok: hasEnvExample || hasEnv,
        message: hasEnv
          ? '.env present'
          : hasEnvExample
            ? '.env.example present (create .env)'
            : 'No environment files',
      });

      let databaseUrl: string | undefined;
      if (hasEnv) {
        const env = await fs.read('.env');
        databaseUrl = env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim();
        checks.push({
          name: 'Database URL',
          ok: Boolean(databaseUrl),
          message: databaseUrl ? 'DATABASE_URL configured' : 'DATABASE_URL missing',
        });
      }

      if (databaseUrl) {
        const ping = await pingDatabase(databaseUrl);
        checks.push({
          name: 'Database connectivity',
          ok: ping.ok,
          message: ping.message,
        });
      }

      if (!ctx.options.skipAudit && (await fs.exists('package.json'))) {
        const audit = await runDependencyAudit(cwd);
        checks.push({
          name: 'Dependency audit',
          ok: audit.ok,
          message: audit.message,
        });
      }

      const features = config.get().features ?? {};

      const featureChecks: Array<{ key: string; label: string; path: string }> = [
        { key: 'auth', label: 'Auth module', path: 'src/modules/auth/auth.service.ts' },
        { key: 'rbac', label: 'RBAC module', path: 'src/modules/rbac/rbac.service.ts' },
        { key: 'database', label: 'Database schema', path: 'prisma/schema.prisma' },
        { key: 'api-docs', label: 'OpenAPI docs', path: 'openapi.json' },
        { key: 'testing', label: 'Testing setup', path: 'tests/unit/example.test.ts' },
        { key: 'docker', label: 'Docker', path: 'Dockerfile' },
        { key: 'kubernetes', label: 'Kubernetes', path: 'k8s/deployment.yaml' },
        {
          key: 'helm',
          label: 'Helm chart',
          path: `helm/${config.get().projectName ?? 'app'}/Chart.yaml`,
        },
        { key: 'terraform', label: 'Terraform', path: 'TERRAFORM.md' },
        { key: 'github', label: 'GitHub integration', path: '.github/workflows/ci.yml' },
        { key: 'cicd', label: 'CI/CD pipeline', path: 'CICD.md' },
        { key: 'release', label: 'Release automation', path: '.changeset/config.json' },
        { key: 'deploy', label: 'Cloud deploy config', path: 'DEPLOY.md' },
        { key: 'devcontainer', label: 'DevContainer', path: '.devcontainer/devcontainer.json' },
        { key: 'ide', label: 'IDE configuration', path: '.vscode/settings.json' },
        { key: 'cache', label: 'Cache service', path: 'src/services/cache/cache.service.ts' },
        { key: 'queue', label: 'Queue service', path: 'src/services/queue/queue.service.ts' },
        {
          key: 'events',
          label: 'Events service',
          path: 'src/services/events/event-bus.service.ts',
        },
        { key: 'mail', label: 'Mail service', path: 'src/services/mail/mail.service.ts' },
        {
          key: 'storage',
          label: 'Storage service',
          path: 'src/services/storage/storage.service.ts',
        },
        {
          key: 'upload',
          label: 'Upload service',
          path: 'src/services/storage/upload.middleware.ts',
        },
        {
          key: 'payment',
          label: 'Payment service',
          path: 'src/services/payment/payment.service.ts',
        },
        {
          key: 'observability',
          label: 'Observability',
          path: 'src/platform/observability/logger.ts',
        },
        {
          key: 'security',
          label: 'Security plugins',
          path: 'src/platform/security/security.plugin.ts',
        },
        { key: 'tenancy', label: 'Tenancy', path: 'src/platform/tenancy/tenant.middleware.ts' },
        {
          key: 'feature-flags',
          label: 'Feature flags',
          path: 'src/platform/feature-flags/feature-flag.service.ts',
        },
        { key: 'search', label: 'Search service', path: 'src/platform/search/search.service.ts' },
        { key: 'ai', label: 'AI scaffolding', path: 'src/ai/client.ts' },
      ];

      for (const feature of featureChecks) {
        if (!features[feature.key]) continue;
        const ok = await fs.exists(feature.path);
        checks.push({
          name: feature.label,
          ok,
          message: ok ? 'Enabled and present' : 'Enabled in config but files missing',
        });
      }

      if (features.auth || features.rbac || features['api-docs']) {
        const routesOk =
          (await fs.exists('src/routes/features.ts')) ||
          (await fs.exists('src/routes/features.js'));
        let registered = false;
        if (routesOk) {
          const routesPath = (await fs.exists('src/routes/features.ts'))
            ? 'src/routes/features.ts'
            : 'src/routes/features.js';
          const routes = await fs.read(routesPath);
          registered =
            (features.auth ? routes.includes('registerAuthRoutes') : true) &&
            (features.rbac ? routes.includes('registerRbacRoutes') : true) &&
            (features['api-docs'] ? routes.includes('registerDocsRoutes') : true);
        }
        checks.push({
          name: 'Feature routes',
          ok: routesOk && registered,
          message:
            routesOk && registered
              ? 'Feature routes registered'
              : 'Missing or incomplete feature routes registration',
        });
      }

      console.log();
      for (const check of checks) {
        const icon = check.ok ? pc.green('✔') : pc.red('✖');
        console.log(`${icon} ${check.name}: ${check.message}`);
      }
      console.log();

      if (!skipReport) {
        const { report, reportPath } = await health.analyze({
          cwd,
          projectName,
          dryRun,
        });
        engine.prompts.note(
          `Score ${report.score}/100 · production-ready=${report.readyForProduction ? 'yes' : 'no'} · fail=${report.summary.fail} warn=${report.summary.warn}`,
          'Enterprise analysis',
        );
        if (dryRun) {
          engine.prompts.info(
            t('doctor_report_dry_run', {
              file: reportPath,
              score: String(report.score),
            }),
          );
        } else {
          engine.prompts.success(
            t('doctor_report_done', {
              file: reportPath,
              score: String(report.score),
            }),
          );
        }
      }

      const failed = checks.filter((c) => !c.ok).length;
      if (failed === 0) {
        engine.prompts.outro(pc.green(t('doctor_all_passed')));
      } else {
        engine.prompts.outro(pc.yellow(t('doctor_attention', { count: String(failed) })));
      }
    },
  });
}
