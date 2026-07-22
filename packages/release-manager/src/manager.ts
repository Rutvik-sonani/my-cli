import { type FileSystem, createFileSystem } from '@mycli-cli/filesystem';
import { type TemplateEngine, createTemplateEngine } from '@mycli-cli/template-engine';
import type { ReleaseSetupOptions, ReleaseSetupResult } from './types.js';

/**
 * Versioning and release automation setup via EJS templates.
 */
export class ReleaseManager {
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

  async setup(options: ReleaseSetupOptions = {}): Promise<ReleaseSetupResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const strategy = options.strategy ?? 'semver';
    const data = {
      appName: options.appName ?? 'app',
      strategy,
      branch: options.branch ?? 'main',
    };
    const written: string[] = [];

    const files = [
      { template: 'features/release/changeset.config.json.ejs', out: '.changeset/config.json' },
      { template: 'features/release/CHANGELOG.md.ejs', out: 'CHANGELOG.md' },
      {
        template:
          strategy === 'calver'
            ? 'features/release/release.calver.config.js.ejs'
            : 'features/release/release.config.js.ejs',
        out: strategy === 'calver' ? 'release.calver.config.js' : 'release.config.js',
      },
      { template: 'features/release/RELEASE.md.ejs', out: 'RELEASE.md' },
    ];

    for (const file of files) {
      const content = await this.templates.renderFile(file.template, { data });
      if (!options.dryRun) {
        await fs.write(file.out, content);
      }
      written.push(file.out);
    }

    return { files: written };
  }
}

export function createReleaseManager(options?: {
  cwd?: string;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
}): ReleaseManager {
  return new ReleaseManager(options);
}

export type { VersionStrategy, ReleaseSetupOptions, ReleaseSetupResult } from './types.js';
