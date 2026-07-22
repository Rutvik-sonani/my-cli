import { DependencyError } from '@mycli-cli/core';
import { type DependencyManager, createDependencyManager } from '@mycli-cli/dependency-manager';
import { type FileSystem, createFileSystem } from '@mycli-cli/filesystem';
import { type TemplateEngine, createTemplateEngine } from '@mycli-cli/template-engine';
import { execa } from 'execa';

export type UiLibrary = 'mui' | 'shadcn' | 'antd' | 'chakra' | 'mantine' | 'tailwind' | 'other';

export interface UiInstallOptions {
  cwd?: string;
  library: UiLibrary;
  packageName?: string;
  dryRun?: boolean;
}

export interface UiSetupOptions extends UiInstallOptions {
  templatesRoot?: string;
  targetDir?: string;
  skipInstall?: boolean;
}

export interface UiSetupResult {
  packages: string[];
  files: string[];
}

const LIBRARY_PACKAGES: Record<Exclude<UiLibrary, 'other' | 'shadcn'>, string[]> = {
  mui: ['@mui/material', '@emotion/react', '@emotion/styled'],
  antd: ['antd'],
  chakra: ['@chakra-ui/react', '@emotion/react', '@emotion/styled', 'framer-motion'],
  mantine: ['@mantine/core', '@mantine/hooks'],
  tailwind: ['tailwindcss', '@tailwindcss/vite'],
};

const UI_TEMPLATE_FILES: Partial<
  Record<Exclude<UiLibrary, 'other'>, Array<{ template: string; out: string }>>
> = {
  tailwind: [
    { template: 'features/ui/tailwind/tailwind.config.js.ejs', out: 'tailwind.config.js' },
    { template: 'features/ui/tailwind/postcss.config.js.ejs', out: 'postcss.config.js' },
    { template: 'features/ui/tailwind/src-index.css.ejs', out: 'src/index.css' },
  ],
  shadcn: [
    { template: 'features/ui/shadcn/components.json.ejs', out: 'components.json' },
    { template: 'features/ui/tailwind/tailwind.config.js.ejs', out: 'tailwind.config.js' },
    { template: 'features/ui/tailwind/src-index.css.ejs', out: 'src/index.css' },
  ],
  mui: [{ template: 'features/ui/mui/theme.ts.ejs', out: 'src/theme.ts' }],
};

/**
 * UI library installer with npm registry checks and EJS config templates.
 */
export class UiManager {
  private readonly deps: DependencyManager;
  private readonly fs: FileSystem;
  private readonly templates: TemplateEngine;
  private readonly cwd: string;

  constructor(
    options: {
      cwd?: string;
      dependencyManager?: DependencyManager;
      filesystem?: FileSystem;
      templateEngine?: TemplateEngine;
      templatesRoot?: string;
    } = {},
  ) {
    this.cwd = options.cwd ?? process.cwd();
    this.deps = options.dependencyManager ?? createDependencyManager({ cwd: this.cwd });
    this.fs = options.filesystem ?? createFileSystem(this.cwd);
    this.templates =
      options.templateEngine ??
      createTemplateEngine({
        filesystem: this.fs,
        templatesRoot: options.templatesRoot ?? 'templates',
      });
  }

  async setup(options: UiSetupOptions): Promise<UiSetupResult> {
    const cwd = options.cwd ?? this.cwd;
    const targetDir = options.targetDir ?? cwd;
    const fs = createFileSystem(targetDir);
    const packages = await this.install({
      ...options,
      cwd: targetDir,
      dryRun: options.dryRun || options.skipInstall,
    });
    const written: string[] = [];
    const templateFiles = UI_TEMPLATE_FILES[options.library as Exclude<UiLibrary, 'other'>];

    if (templateFiles) {
      const data = { appName: 'app' } as Record<string, unknown>;
      for (const file of templateFiles) {
        const content = await this.templates.renderFile(file.template, { data });
        if (!options.dryRun) {
          await fs.write(file.out, content);
        }
        written.push(file.out);
      }
    }

    return { packages, files: written };
  }

  async install(options: UiInstallOptions): Promise<string[]> {
    const cwd = options.cwd ?? this.cwd;

    if (options.library === 'other') {
      if (!options.packageName) {
        throw new DependencyError('Package name is required when UI library is Other', {
          code: 'DEPENDENCY_INSTALL_FAILED',
        });
      }
      const exists = await this.packageExists(options.packageName);
      if (!exists) {
        throw new DependencyError(`Package not found on npm registry: ${options.packageName}`, {
          code: 'DEPENDENCY_INSTALL_FAILED',
          details: { packageName: options.packageName },
        });
      }
      if (!options.dryRun) {
        await this.deps.add([options.packageName], { cwd });
      }
      return [options.packageName];
    }

    if (options.library === 'shadcn') {
      const packages = [
        'class-variance-authority',
        'clsx',
        'tailwind-merge',
        'lucide-react',
        'tailwindcss',
      ];
      if (!options.dryRun) {
        await this.deps.add(packages, { cwd });
      }
      return packages;
    }

    const packages = LIBRARY_PACKAGES[options.library];
    if (!options.dryRun) {
      await this.deps.add(packages, { cwd });
    }
    return packages;
  }

  async packageExists(packageName: string): Promise<boolean> {
    try {
      const result = await execa('npm', ['view', packageName, 'version'], { reject: false });
      return result.exitCode === 0 && Boolean(result.stdout.trim());
    } catch {
      return false;
    }
  }
}

export function createUiManager(options?: {
  cwd?: string;
  dependencyManager?: DependencyManager;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
}): UiManager {
  return new UiManager(options);
}
