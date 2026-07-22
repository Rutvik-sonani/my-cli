import { type FileSystem, createFileSystem } from '@mycli/filesystem';
import { type TemplateEngine, createTemplateEngine } from '@mycli/template-engine';

export type UnitTestFramework = 'vitest' | 'jest';
export type E2EFramework = 'playwright' | 'cypress' | 'none';

export interface TestingSetupOptions {
  cwd?: string;
  unit?: UnitTestFramework;
  e2e?: E2EFramework;
  integration?: boolean;
  language?: 'typescript' | 'javascript';
  dryRun?: boolean;
}

export interface TestingSetupResult {
  files: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

function testingDeps(options: TestingSetupOptions): {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
} {
  const unit = options.unit ?? 'vitest';
  const e2e = options.e2e ?? 'none';
  const isJs = options.language === 'javascript';
  const dependencies: Record<string, string> = {};
  const devDependencies: Record<string, string> = {};

  if (unit === 'vitest') {
    devDependencies.vitest = '^2.1.8';
  } else {
    devDependencies.jest = '^29.7.0';
    if (!isJs) {
      devDependencies['@types/jest'] = '^29.5.14';
      devDependencies['ts-jest'] = '^29.2.5';
    }
  }

  if (options.integration !== false) {
    devDependencies.supertest = '^7.0.0';
    if (!isJs) {
      devDependencies['@types/supertest'] = '^6.0.2';
    }
  }

  if (e2e === 'playwright') {
    devDependencies['@playwright/test'] = '^1.49.1';
  } else if (e2e === 'cypress') {
    devDependencies.cypress = '^13.17.0';
  }

  return { dependencies, devDependencies };
}

/**
 * Testing system setup: unit, integration, e2e scaffolds and configs.
 */
export class TestingManager {
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

  async setup(options: TestingSetupOptions = {}): Promise<TestingSetupResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const unit = options.unit ?? 'vitest';
    const e2e = options.e2e ?? 'none';
    const integration = options.integration !== false;
    const isJs = options.language === 'javascript';
    const data = { unit, e2e, integration };
    const written: string[] = [];

    const dirs = [
      'tests/unit',
      'tests/integration',
      'tests/e2e',
      'tests/fixtures',
      'tests/factories',
    ];
    if (!options.dryRun) {
      for (const dir of dirs) {
        await fs.ensureDir(dir);
      }
    }
    written.push(...dirs);

    const templateFiles: Array<{ template: string; out: string }> = [
      {
        template: isJs
          ? 'features/testing/unit.example.test.js.ejs'
          : 'features/testing/unit.example.test.ts.ejs',
        out: isJs ? 'tests/unit/example.test.js' : 'tests/unit/example.test.ts',
      },
      { template: 'features/testing/TESTING.md.ejs', out: 'TESTING.md' },
    ];

    if (unit === 'vitest') {
      templateFiles.push({
        template: isJs
          ? 'features/testing/vitest.config.js.ejs'
          : 'features/testing/vitest.config.ts.ejs',
        out: isJs ? 'vitest.config.js' : 'vitest.config.ts',
      });
    } else {
      templateFiles.push({
        template: 'features/testing/jest.config.ts.ejs',
        out: 'jest.config.ts',
      });
    }

    if (integration) {
      templateFiles.push({
        template: isJs
          ? 'features/testing/integration.health.test.js.ejs'
          : 'features/testing/integration.health.test.ts.ejs',
        out: isJs ? 'tests/integration/health.test.js' : 'tests/integration/health.test.ts',
      });
    }

    if (e2e === 'playwright') {
      templateFiles.push({
        template: 'features/testing/playwright.config.ts.ejs',
        out: 'playwright.config.ts',
      });
      templateFiles.push({
        template: 'features/testing/e2e.health.spec.ts.ejs',
        out: 'tests/e2e/health.spec.ts',
      });
    } else if (e2e === 'cypress') {
      templateFiles.push({
        template: 'features/testing/cypress.config.ts.ejs',
        out: 'cypress.config.ts',
      });
    }

    for (const file of templateFiles) {
      const content = await this.templates.renderFile(file.template, { data });
      if (!options.dryRun) {
        await fs.write(file.out, content);
      }
      written.push(file.out);
    }

    const deps = testingDeps(options);
    return { files: written, ...deps };
  }
}

export function createTestingManager(options?: {
  cwd?: string;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
}): TestingManager {
  return new TestingManager(options);
}
