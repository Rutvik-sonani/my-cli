import { join } from 'node:path';
import type { FeatureFlagProviderId } from '@mycli-cli/enterprise-core';
import { type FileSystem, createFileSystem } from '@mycli-cli/filesystem';
import { type TemplateEngine, createTemplateEngine } from '@mycli-cli/template-engine';
import {
  type FeatureFlagPathConfig,
  getFeatureFlagDependencies,
  getFeatureFlagEnvLines,
  providerClassName,
  providerTemplateFile,
  resolveFeatureFlagPaths,
} from './config.js';

export interface FeatureFlagSetupOptions {
  appName: string;
  provider?: FeatureFlagProviderId;
  cwd?: string;
  dryRun?: boolean;
  paths?: FeatureFlagPathConfig;
  language?: 'typescript' | 'javascript';
}

export interface FeatureFlagSetupResult {
  files: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

interface TemplateFile {
  template: string;
  out: (paths: ReturnType<typeof resolveFeatureFlagPaths>) => string;
}

/**
 * Scaffolds enterprise feature flags: provider interface, targeting, service.
 */
export class FeatureFlagManager {
  private readonly fs: FileSystem;
  private readonly templates: TemplateEngine;

  constructor(
    options: {
      cwd?: string;
      filesystem?: FileSystem;
      templateEngine?: TemplateEngine;
      templatesRoot?: string;
    } = {},
  ) {
    const cwd = options.cwd ?? process.cwd();
    this.fs = options.filesystem ?? createFileSystem(cwd);
    this.templates =
      options.templateEngine ??
      createTemplateEngine({
        filesystem: this.fs,
        templatesRoot: options.templatesRoot ?? 'templates',
      });
  }

  async setup(options: FeatureFlagSetupOptions): Promise<FeatureFlagSetupResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const paths = resolveFeatureFlagPaths(options.paths);
    const provider = options.provider ?? 'database';
    const language = options.language ?? 'typescript';
    const templateData = {
      appName: options.appName,
      provider,
      providerClass: providerClassName(provider),
      language,
      paths,
      isDatabase: provider === 'database',
      isLaunchDarkly: provider === 'launchdarkly',
      isUnleash: provider === 'unleash',
    } as Record<string, unknown>;

    const files: TemplateFile[] = [
      {
        template: 'features/feature-flags/feature-flag.types.ts.ejs',
        out: (p) => join(p.root, 'feature-flag.types.ts'),
      },
      {
        template: 'features/feature-flags/feature-flag-provider.interface.ts.ejs',
        out: (p) => join(p.root, 'feature-flag-provider.interface.ts'),
      },
      {
        template: 'features/feature-flags/targeting/evaluate.ts.ejs',
        out: (p) => join(p.targeting, 'evaluate.ts'),
      },
      {
        template: 'features/feature-flags/targeting/percentage.ts.ejs',
        out: (p) => join(p.targeting, 'percentage.ts'),
      },
      {
        template: 'features/feature-flags/providers/database.provider.ts.ejs',
        out: (p) => join(p.providers, 'database.provider.ts'),
      },
    ];

    if (provider !== 'database') {
      files.push({
        template: providerTemplateFile(provider),
        out: (p) => join(p.providers, `${provider}.provider.ts`),
      });
    }

    files.push(
      {
        template: 'features/feature-flags/providers/index.ts.ejs',
        out: (p) => join(p.providers, 'index.ts'),
      },
      {
        template: 'features/feature-flags/feature-flag.service.ts.ejs',
        out: (p) => join(p.root, 'feature-flag.service.ts'),
      },
      {
        template: 'features/feature-flags/register-feature-flags.ts.ejs',
        out: (p) => join(p.root, 'register-feature-flags.ts'),
      },
      {
        template: 'features/feature-flags/index.ts.ejs',
        out: (p) => join(p.root, 'index.ts'),
      },
      {
        template: 'features/feature-flags/tests/feature-flags.test.ts.ejs',
        out: () => join('tests', 'feature-flags', 'feature-flags.test.ts'),
      },
    );

    // Always ship a local JSON flag file for offline / fallback evaluation
    files.push({
      template: 'features/feature-flags/flags.json.ejs',
      out: () => join('config', 'feature-flags.json'),
    });

    const written: string[] = [];
    for (const file of files) {
      const outPath = file.out(paths);
      const content = await this.templates.renderFile(file.template, { data: templateData });
      if (!options.dryRun) {
        await fs.write(outPath, content);
      }
      written.push(outPath);
    }

    const docContent = await this.templates.renderFile(
      'features/feature-flags/FEATURE_FLAGS.md.ejs',
      {
        data: templateData,
      },
    );
    if (!options.dryRun) {
      await fs.write('FEATURE_FLAGS.md', docContent);
      const envSection = `# FEATURE FLAGS\n${getFeatureFlagEnvLines(options.appName, provider).join('\n')}\n`;
      await fs.append('.env.example', `\n${envSection}`);
    }
    written.push('FEATURE_FLAGS.md', '.env.example');

    const deps = getFeatureFlagDependencies(provider);
    return {
      files: written,
      dependencies: deps.dependencies,
      devDependencies: deps.devDependencies,
    };
  }
}

export function createFeatureFlagManager(options?: {
  cwd?: string;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
}): FeatureFlagManager {
  return new FeatureFlagManager(options);
}
