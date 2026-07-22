import type { FileSystem } from '@mycli/filesystem';
import type { TemplateEngine } from '@mycli/template-engine';

export type QualityToolchain = 'biome' | 'eslint';

export interface QualitySetupOptions {
  cwd?: string;
  toolchain?: QualityToolchain;
  eslint?: boolean;
  prettier?: boolean;
  dryRun?: boolean;
}

export interface QualitySetupResult {
  files: string[];
  devDependencies: Record<string, string>;
  lintScript: string;
}

export async function setupQuality(
  fs: FileSystem,
  templates: TemplateEngine,
  options: QualitySetupOptions = {},
): Promise<QualitySetupResult> {
  const toolchain = options.toolchain ?? 'biome';
  const useEslint = options.eslint ?? toolchain === 'eslint';
  const usePrettier = options.prettier ?? false;
  const written: string[] = [];
  const devDependencies: Record<string, string> = {};

  if (toolchain === 'biome' || !useEslint) {
    const biome = await templates.renderFile('features/quality/biome.json.ejs', { data: {} });
    if (!options.dryRun) {
      await fs.write('biome.json', biome);
    }
    written.push('biome.json');
    devDependencies['@biomejs/biome'] = '^1.9.4';
  }

  if (useEslint) {
    const eslint = await templates.renderFile('features/quality/eslint.config.js.ejs', {
      data: {},
    });
    if (!options.dryRun) {
      await fs.write('eslint.config.js', eslint);
    }
    written.push('eslint.config.js');
    devDependencies.eslint = '^9.17.0';
    devDependencies['@eslint/js'] = '^9.17.0';
    devDependencies.globals = '^15.14.0';
  }

  if (usePrettier) {
    const prettier = await templates.renderFile('features/quality/prettier.config.js.ejs', {
      data: {},
    });
    if (!options.dryRun) {
      await fs.write('prettier.config.js', prettier);
    }
    written.push('prettier.config.js');
    devDependencies.prettier = '^3.4.2';
  }

  const lintScript = useEslint
    ? usePrettier
      ? 'eslint . && prettier --check .'
      : 'eslint .'
    : 'biome check .';

  return { files: written, devDependencies, lintScript };
}
