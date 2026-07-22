import { type FileSystem, createFileSystem } from '@mycli/filesystem';
import { type TemplateEngine, createTemplateEngine } from '@mycli/template-engine';
import type { FrontendFramework, FrontendSetupOptions, FrontendSetupResult } from './types.js';

const FRAMEWORK_FILES: Record<
  Exclude<FrontendFramework, 'none'>,
  Array<{ template: string; out: string }>
> = {
  react: [
    { template: 'features/frontend/react/package.json.ejs', out: 'frontend/package.json' },
    { template: 'features/frontend/react/vite.config.ts.ejs', out: 'frontend/vite.config.ts' },
    { template: 'features/frontend/react/tsconfig.json.ejs', out: 'frontend/tsconfig.json' },
    { template: 'features/frontend/react/index.html.ejs', out: 'frontend/index.html' },
    { template: 'features/frontend/react/src/main.tsx.ejs', out: 'frontend/src/main.tsx' },
    { template: 'features/frontend/react/src/App.tsx.ejs', out: 'frontend/src/App.tsx' },
    { template: 'features/frontend/react/FRONTEND.md.ejs', out: 'frontend/FRONTEND.md' },
  ],
  next: [
    { template: 'features/frontend/next/package.json.ejs', out: 'frontend/package.json' },
    { template: 'features/frontend/next/next.config.ts.ejs', out: 'frontend/next.config.ts' },
    { template: 'features/frontend/next/tsconfig.json.ejs', out: 'frontend/tsconfig.json' },
    {
      template: 'features/frontend/next/src/app/layout.tsx.ejs',
      out: 'frontend/src/app/layout.tsx',
    },
    { template: 'features/frontend/next/src/app/page.tsx.ejs', out: 'frontend/src/app/page.tsx' },
    { template: 'features/frontend/next/FRONTEND.md.ejs', out: 'frontend/FRONTEND.md' },
  ],
  vue: [
    { template: 'features/frontend/vue/package.json.ejs', out: 'frontend/package.json' },
    { template: 'features/frontend/vue/vite.config.ts.ejs', out: 'frontend/vite.config.ts' },
    { template: 'features/frontend/vue/tsconfig.json.ejs', out: 'frontend/tsconfig.json' },
    { template: 'features/frontend/vue/index.html.ejs', out: 'frontend/index.html' },
    { template: 'features/frontend/vue/src/main.ts.ejs', out: 'frontend/src/main.ts' },
    { template: 'features/frontend/vue/src/App.vue.ejs', out: 'frontend/src/App.vue' },
    { template: 'features/frontend/vue/FRONTEND.md.ejs', out: 'frontend/FRONTEND.md' },
  ],
  nuxt: [
    { template: 'features/frontend/nuxt/package.json.ejs', out: 'frontend/package.json' },
    { template: 'features/frontend/nuxt/nuxt.config.ts.ejs', out: 'frontend/nuxt.config.ts' },
    { template: 'features/frontend/nuxt/app.vue.ejs', out: 'frontend/app.vue' },
    { template: 'features/frontend/nuxt/FRONTEND.md.ejs', out: 'frontend/FRONTEND.md' },
  ],
  angular: [
    { template: 'features/frontend/angular/package.json.ejs', out: 'frontend/package.json' },
    { template: 'features/frontend/angular/angular.json.ejs', out: 'frontend/angular.json' },
    { template: 'features/frontend/angular/tsconfig.json.ejs', out: 'frontend/tsconfig.json' },
    { template: 'features/frontend/angular/src/index.html.ejs', out: 'frontend/src/index.html' },
    { template: 'features/frontend/angular/src/main.ts.ejs', out: 'frontend/src/main.ts' },
    {
      template: 'features/frontend/angular/src/app/app.component.ts.ejs',
      out: 'frontend/src/app/app.component.ts',
    },
    { template: 'features/frontend/angular/FRONTEND.md.ejs', out: 'frontend/FRONTEND.md' },
  ],
};

/**
 * Frontend scaffolding via EJS templates (React, Next.js, Vue, Nuxt, Angular).
 */
export class FrontendManager {
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

  async setup(options: FrontendSetupOptions): Promise<FrontendSetupResult> {
    if (options.framework === 'none') {
      return { files: [] };
    }

    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const data = {
      appName: options.appName,
      framework: options.framework,
      language: options.language ?? 'typescript',
    };
    const templateData = data as unknown as Record<string, unknown>;
    const written: string[] = [];
    const files = FRAMEWORK_FILES[options.framework as Exclude<FrontendFramework, 'none'>];

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

export function createFrontendManager(options?: {
  cwd?: string;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
}): FrontendManager {
  return new FrontendManager(options);
}
