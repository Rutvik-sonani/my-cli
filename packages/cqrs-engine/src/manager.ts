import { join } from 'node:path';
import { type FileSystem, createFileSystem } from '@mycli-cli/filesystem';
import { type TemplateEngine, createTemplateEngine } from '@mycli-cli/template-engine';
import { type CqrsPathConfig, resolveCqrsPaths } from './paths.js';

export interface CqrsSetupOptions {
  appName: string;
  cwd?: string;
  dryRun?: boolean;
  paths?: CqrsPathConfig;
  language?: 'typescript' | 'javascript';
}

export interface CqrsSetupResult {
  files: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

interface TemplateFile {
  template: string;
  out: (paths: ReturnType<typeof resolveCqrsPaths>) => string;
}

const SETUP_FILES: TemplateFile[] = [
  { template: 'features/cqrs/command-bus.ts.ejs', out: (p) => join(p.root, 'command-bus.ts') },
  { template: 'features/cqrs/query-bus.ts.ejs', out: (p) => join(p.root, 'query-bus.ts') },
  { template: 'features/cqrs/event-bus.ts.ejs', out: (p) => join(p.root, 'event-bus.ts') },
  {
    template: 'features/cqrs/middleware/logging.middleware.ts.ejs',
    out: (p) => join(p.middleware, 'logging.middleware.ts'),
  },
  {
    template: 'features/cqrs/middleware/validation.middleware.ts.ejs',
    out: (p) => join(p.middleware, 'validation.middleware.ts'),
  },
  {
    template: 'features/cqrs/middleware/pipeline.ts.ejs',
    out: (p) => join(p.middleware, 'pipeline.ts'),
  },
  { template: 'features/cqrs/index.ts.ejs', out: (p) => join(p.root, 'index.ts') },
  {
    template: 'features/cqrs/register-handlers.ts.ejs',
    out: (p) => join(p.root, 'register-handlers.ts'),
  },
  {
    template: 'features/cqrs/application/commands/CreateUserCommand.ts.ejs',
    out: (p) => join(p.commands, 'CreateUserCommand.ts'),
  },
  {
    template: 'features/cqrs/application/commands/handlers/CreateUserHandler.ts.ejs',
    out: (p) => join(p.commandHandlers, 'CreateUserHandler.ts'),
  },
  {
    template: 'features/cqrs/application/queries/GetUserQuery.ts.ejs',
    out: (p) => join(p.queries, 'GetUserQuery.ts'),
  },
  {
    template: 'features/cqrs/application/queries/handlers/GetUserHandler.ts.ejs',
    out: (p) => join(p.queryHandlers, 'GetUserHandler.ts'),
  },
  {
    template: 'features/cqrs/application/events/UserCreatedEvent.ts.ejs',
    out: (p) => join(p.events, 'UserCreatedEvent.ts'),
  },
  {
    template: 'features/cqrs/tests/cqrs-buses.test.ts.ejs',
    out: () => join('tests', 'cqrs', 'cqrs-buses.test.ts'),
  },
];

/**
 * Scaffolds CQRS buses, middleware, example User commands/queries/events, and tests.
 */
export class CqrsManager {
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

  async setup(options: CqrsSetupOptions): Promise<CqrsSetupResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const paths = resolveCqrsPaths(options.paths);
    const language = options.language ?? 'typescript';
    const templateData = {
      appName: options.appName,
      language,
      paths,
    } as Record<string, unknown>;

    const written: string[] = [];

    for (const file of SETUP_FILES) {
      const outPath = file.out(paths);
      const content = await this.templates.renderFile(file.template, { data: templateData });
      if (!options.dryRun) {
        await fs.write(outPath, content);
      }
      written.push(outPath);
    }

    const docContent = await this.templates.renderFile('features/cqrs/CQRS.md.ejs', {
      data: templateData,
    });
    if (!options.dryRun) {
      await fs.write('CQRS.md', docContent);
    }
    written.push('CQRS.md');

    return {
      files: written,
      dependencies: {},
      devDependencies: {},
    };
  }
}

export function createCqrsManager(options?: {
  cwd?: string;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
}): CqrsManager {
  return new CqrsManager(options);
}
