import type { CliEngine } from '@mycli/cli-engine';
import { defineCommand } from '@mycli/command-engine';
import { createDependencyManager } from '@mycli/dependency-manager';
import { createFileSystem } from '@mycli/filesystem';

type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

async function resolveScriptCommand(cwd: string, script: string): Promise<string> {
  const deps = createDependencyManager({ cwd });
  try {
    const detected = await deps.detect();
    const pm = detected.manager as PackageManager;
    if (pm === 'npm') return script === 'test' ? 'npm test' : `npm run ${script}`;
    if (pm === 'yarn') return `yarn ${script}`;
    if (pm === 'bun') return `bun run ${script}`;
    return `pnpm run ${script}`;
  } catch {
    return script === 'test' ? 'pnpm test' : `pnpm run ${script}`;
  }
}

function createScriptCommand(
  engine: CliEngine,
  name: string,
  script: string,
  description: string,
): ReturnType<typeof defineCommand> {
  return defineCommand({
    name,
    description,
    options: [{ flags: '--dry-run', description: 'Preview without running', defaultValue: false }],
    examples: [`my ${name}`],
    async handler(ctx) {
      const t = (key: string, params?: Record<string, string>) => engine.i18n.t(key, params);
      const dryRun = Boolean(ctx.options.dryRun);
      const cwd = engine.app.cwd;
      const fs = createFileSystem(cwd);

      if (!(await fs.exists('package.json'))) {
        throw new Error(t('workflow_no_package_json'));
      }

      const command = await resolveScriptCommand(cwd, script);
      if (dryRun) {
        engine.prompts.info(t('workflow_would_run', { command }));
        return;
      }

      const deps = createDependencyManager({ cwd });
      const result = await deps.run(script);
      if (result.exitCode !== 0) {
        process.exitCode = result.exitCode;
      }
    },
  });
}

export function devCommand(engine: CliEngine) {
  return createScriptCommand(
    engine,
    'dev',
    'dev',
    'Run the development server (package.json dev script)',
  );
}

export function testCommand(engine: CliEngine) {
  return defineCommand({
    name: 'test',
    description: 'Run tests via the project test script',
    options: [{ flags: '--dry-run', description: 'Preview without running', defaultValue: false }],
    examples: ['my test'],
    async handler(ctx) {
      const t = (key: string, params?: Record<string, string>) => engine.i18n.t(key, params);
      const dryRun = Boolean(ctx.options.dryRun);
      const cwd = engine.app.cwd;
      const fs = createFileSystem(cwd);
      if (!(await fs.exists('package.json'))) {
        throw new Error(t('workflow_no_package_json'));
      }
      const command = await resolveScriptCommand(cwd, 'test');
      if (dryRun) {
        engine.prompts.info(t('workflow_would_run', { command }));
        return;
      }
      const deps = createDependencyManager({ cwd });
      const result = await deps.run('test');
      if (result.exitCode !== 0) {
        process.exitCode = result.exitCode;
      }
    },
  });
}

export function lintCommand(engine: CliEngine) {
  return createScriptCommand(engine, 'lint', 'lint', 'Run lint checks (package.json lint script)');
}

export function buildCommand(engine: CliEngine) {
  return createScriptCommand(
    engine,
    'build',
    'build',
    'Build the project (package.json build script)',
  );
}
