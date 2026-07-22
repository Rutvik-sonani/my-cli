import { type FileSystem, createFileSystem } from '@mycli/filesystem';
import { type TemplateEngine, createTemplateEngine } from '@mycli/template-engine';
import type {
  ArchitectureSetupOptions,
  ArchitectureSetupResult,
  ArchitectureType,
} from './types.js';

const ARCHITECTURE_FILES: Record<ArchitectureType, Array<{ template: string; out: string }>> = {
  monolith: [
    { template: 'architecture/monolith/ARCHITECTURE.md.ejs', out: 'ARCHITECTURE.md' },
    { template: 'architecture/monolith/src/shared/README.md.ejs', out: 'src/shared/README.md' },
    { template: 'architecture/monolith/src/config/index.ts.ejs', out: 'src/config/index.ts' },
  ],
  'modular-monolith': [
    { template: 'architecture/modular-monolith/ARCHITECTURE.md.ejs', out: 'ARCHITECTURE.md' },
    {
      template: 'architecture/modular-monolith/src/modules/README.md.ejs',
      out: 'src/modules/README.md',
    },
  ],
  microservice: [
    { template: 'architecture/microservice/ARCHITECTURE.md.ejs', out: 'ARCHITECTURE.md' },
    { template: 'architecture/microservice/services/README.md.ejs', out: 'services/README.md' },
  ],
  monorepo: [
    { template: 'architecture/monorepo/ARCHITECTURE.md.ejs', out: 'ARCHITECTURE.md' },
    { template: 'architecture/monorepo/pnpm-workspace.yaml.ejs', out: 'pnpm-workspace.yaml' },
    { template: 'architecture/monorepo/apps/README.md.ejs', out: 'apps/README.md' },
    {
      template: 'architecture/monorepo/packages/shared/package.json.ejs',
      out: 'packages/shared/package.json',
    },
    {
      template: 'architecture/monorepo/packages/shared/src/index.ts.ejs',
      out: 'packages/shared/src/index.ts',
    },
  ],
  polyrepo: [
    { template: 'architecture/polyrepo/ARCHITECTURE.md.ejs', out: 'ARCHITECTURE.md' },
    { template: 'architecture/polyrepo/POLYREPO.md.ejs', out: 'POLYREPO.md' },
  ],
};

/**
 * Applies architecture-specific directory layout and documentation via EJS templates.
 */
export class ArchitectureManager {
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

  async setup(options: ArchitectureSetupOptions): Promise<ArchitectureSetupResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const data = {
      appName: options.appName,
      architecture: options.architecture,
      backend: options.backend ?? 'none',
      frontend: options.frontend ?? 'none',
    };
    const templateData = data as unknown as Record<string, unknown>;
    const written: string[] = [];
    const files = ARCHITECTURE_FILES[options.architecture] ?? [];

    for (const file of files) {
      const content = await this.templates.renderFile(file.template, { data: templateData });
      if (!options.dryRun) {
        await fs.write(file.out, content);
      }
      written.push(file.out);
    }

    return { files: written };
  }
}

export function createArchitectureManager(options?: {
  cwd?: string;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
}): ArchitectureManager {
  return new ArchitectureManager(options);
}
