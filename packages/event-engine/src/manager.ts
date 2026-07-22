import { join } from 'node:path';
import type { EventSystemProvider } from '@mycli-cli/enterprise-core';
import { type FileSystem, createFileSystem } from '@mycli-cli/filesystem';
import { type TemplateEngine, createTemplateEngine } from '@mycli-cli/template-engine';
import {
  type EventSystemPathConfig,
  getEventSystemDependencies,
  getEventSystemEnvLines,
  resolveEventSystemPaths,
} from './config.js';

export interface EventSystemSetupOptions {
  appName: string;
  provider: EventSystemProvider;
  cwd?: string;
  dryRun?: boolean;
  paths?: EventSystemPathConfig;
  language?: 'typescript' | 'javascript';
}

export interface EventSystemSetupResult {
  files: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

interface TemplateFile {
  template: string;
  out: (paths: ReturnType<typeof resolveEventSystemPaths>) => string;
}

const SHARED_FILES: TemplateFile[] = [
  {
    template: 'features/event-system/publishers/event-publisher.interface.ts.ejs',
    out: (p) => join(p.publishers, 'event-publisher.interface.ts'),
  },
  {
    template: 'features/event-system/serializer.ts.ejs',
    out: (p) => join(p.root, 'serializer.ts'),
  },
  {
    template: 'features/event-system/retry.policy.ts.ejs',
    out: (p) => join(p.root, 'retry.policy.ts'),
  },
  {
    template: 'features/event-system/dead-letter/dead-letter.queue.ts.ejs',
    out: (p) => join(p.deadLetter, 'dead-letter.queue.ts'),
  },
  {
    template: 'features/event-system/dead-letter/dead-letter.handler.ts.ejs',
    out: (p) => join(p.deadLetter, 'dead-letter.handler.ts'),
  },
  {
    template: 'features/event-system/events/UserCreatedEvent.ts.ejs',
    out: (p) => join(p.events, 'UserCreatedEvent.ts'),
  },
  {
    template: 'features/event-system/schemas/user-created.v1.schema.json.ejs',
    out: (p) => join(p.schemas, 'user-created.v1.schema.json'),
  },
  {
    template: 'features/event-system/handlers/user-created.handler.ts.ejs',
    out: (p) => join(p.handlers, 'user-created.handler.ts'),
  },
  {
    template: 'features/event-system/consumers/user-created.consumer.ts.ejs',
    out: (p) => join(p.consumers, 'user-created.consumer.ts'),
  },
  {
    template: 'features/event-system/publishers/index.ts.ejs',
    out: (p) => join(p.publishers, 'index.ts'),
  },
  {
    template: 'features/event-system/consumers/index.ts.ejs',
    out: (p) => join(p.consumers, 'index.ts'),
  },
  {
    template: 'features/event-system/register-handlers.ts.ejs',
    out: (p) => join(p.root, 'register-handlers.ts'),
  },
  { template: 'features/event-system/index.ts.ejs', out: (p) => join(p.root, 'index.ts') },
  {
    template: 'features/event-system/tests/event-system.test.ts.ejs',
    out: () => join('tests', 'event-system', 'event-system.test.ts'),
  },
];

const PROVIDER_PUBLISHER: Record<EventSystemProvider, string> = {
  kafka: 'features/event-system/publishers/kafka.publisher.ts.ejs',
  rabbitmq: 'features/event-system/publishers/rabbitmq.publisher.ts.ejs',
  nats: 'features/event-system/publishers/nats.publisher.ts.ejs',
  redis: 'features/event-system/publishers/redis.publisher.ts.ejs',
  eventbridge: 'features/event-system/publishers/eventbridge.publisher.ts.ejs',
};

const PROVIDER_CONSUMER: Record<EventSystemProvider, string> = {
  kafka: 'features/event-system/consumers/kafka.consumer.ts.ejs',
  rabbitmq: 'features/event-system/consumers/rabbitmq.consumer.ts.ejs',
  nats: 'features/event-system/consumers/nats.consumer.ts.ejs',
  redis: 'features/event-system/consumers/redis.consumer.ts.ejs',
  eventbridge: 'features/event-system/consumers/eventbridge.consumer.ts.ejs',
};

/**
 * Scaffolds enterprise event-driven architecture with provider-specific publishers/consumers.
 */
export class EventSystemManager {
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

  async setup(options: EventSystemSetupOptions): Promise<EventSystemSetupResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const paths = resolveEventSystemPaths(options.paths);
    const language = options.language ?? 'typescript';
    const templateData = {
      appName: options.appName,
      provider: options.provider,
      language,
      paths,
    } as Record<string, unknown>;

    const written: string[] = [];
    const files: TemplateFile[] = [
      ...SHARED_FILES,
      {
        template: PROVIDER_PUBLISHER[options.provider],
        out: (p) => join(p.publishers, `${options.provider}.publisher.ts`),
      },
      {
        template: PROVIDER_CONSUMER[options.provider],
        out: (p) => join(p.consumers, `${options.provider}.consumer.ts`),
      },
    ];

    for (const file of files) {
      const outPath = file.out(paths);
      const content = await this.templates.renderFile(file.template, { data: templateData });
      if (!options.dryRun) {
        await fs.write(outPath, content);
      }
      written.push(outPath);
    }

    const docContent = await this.templates.renderFile(
      'features/event-system/EVENT_SYSTEM.md.ejs',
      {
        data: templateData,
      },
    );
    if (!options.dryRun) {
      await fs.write('EVENT_SYSTEM.md', docContent);
      const envSection = `# EVENT SYSTEM (${options.provider})\n${getEventSystemEnvLines(options.provider, options.appName).join('\n')}\n`;
      await fs.append('.env.example', `\n${envSection}`);
    }
    written.push('EVENT_SYSTEM.md', '.env.example');

    const deps = getEventSystemDependencies(options.provider);
    return {
      files: written,
      dependencies: deps.dependencies,
      devDependencies: deps.devDependencies,
    };
  }
}

export function createEventSystemManager(options?: {
  cwd?: string;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
}): EventSystemManager {
  return new EventSystemManager(options);
}
