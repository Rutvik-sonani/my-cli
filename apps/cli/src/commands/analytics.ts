import type { CliEngine } from '@mycli-cli/cli-engine';
import { defineCommand } from '@mycli-cli/command-engine';
import { createConfigManager } from '@mycli-cli/config-manager';
import { createFileSystem } from '@mycli-cli/filesystem';

export function analyticsCommand(engine: CliEngine) {
  return defineCommand({
    name: 'analytics',
    description: 'Show optional project analytics (modules, plugins, dependencies, health)',
    examples: ['my analytics'],
    async handler() {
      const t = (key: string, params?: Record<string, string>) => engine.i18n.t(key, params);
      const config = createConfigManager({ cwd: engine.app.cwd });
      await config.load();
      const cfg = config.get();
      const fs = createFileSystem(engine.app.cwd);

      const modulesPath = cfg.paths?.modules ?? 'src/modules';
      let moduleCount = 0;
      if (await fs.isDirectory(modulesPath)) {
        const entries = await fs.list(modulesPath);
        moduleCount = entries.filter((e) => e.isDirectory).length;
      }

      let dependencyCount = 0;
      if (await fs.exists('package.json')) {
        const pkg = await fs.readJson<{
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
        }>('package.json');
        dependencyCount =
          Object.keys(pkg.dependencies ?? {}).length +
          Object.keys(pkg.devDependencies ?? {}).length;
      }

      const features = Object.entries(cfg.features ?? {})
        .filter(([, enabled]) => enabled)
        .map(([name]) => name);

      engine.prompts.intro(t('analytics_intro'));
      console.log(`  ${t('analytics_project')}:      ${cfg.projectName ?? '(unnamed)'}`);
      console.log(`  ${t('analytics_modules')}:      ${moduleCount}`);
      console.log(`  ${t('analytics_plugins')}:      ${(cfg.plugins ?? []).length}`);
      console.log(`  ${t('analytics_dependencies')}: ${dependencyCount}`);
      console.log(
        `  ${t('analytics_features')}:     ${features.length ? features.join(', ') : t('analytics_features_none')}`,
      );
      console.log(
        `  ${t('analytics_health')}:       ${cfg.projectName && dependencyCount > 0 ? t('analytics_health_ok') : t('analytics_health_incomplete')}`,
      );
      engine.prompts.outro(t('analytics_outro'));
    },
  });
}
