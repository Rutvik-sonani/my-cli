import { join } from 'node:path';
import type { ObservabilityLoggerId } from '@mycli-cli/enterprise-core';
import { type FileSystem, createFileSystem } from '@mycli-cli/filesystem';
import { type TemplateEngine, createTemplateEngine } from '@mycli-cli/template-engine';
import {
  type ObservabilityPathConfig,
  getObservabilityDependencies,
  getObservabilityEnvLines,
  resolveObservabilityPaths,
} from './config.js';

export interface ObservabilitySetupOptions {
  appName: string;
  logger?: ObservabilityLoggerId;
  cwd?: string;
  dryRun?: boolean;
  paths?: ObservabilityPathConfig;
  language?: 'typescript' | 'javascript';
}

export interface ObservabilitySetupResult {
  files: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

interface TemplateFile {
  template: string;
  out: (paths: ReturnType<typeof resolveObservabilityPaths>) => string;
}

/**
 * Scaffolds enterprise observability: logging, metrics, tracing, alerts, errors.
 */
export class ObservabilityManager {
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

  async setup(options: ObservabilitySetupOptions): Promise<ObservabilitySetupResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const paths = resolveObservabilityPaths(options.paths);
    const logger = options.logger ?? 'pino';
    const language = options.language ?? 'typescript';
    const templateData = {
      appName: options.appName,
      logger,
      language,
      paths,
      isPino: logger === 'pino',
      isWinston: logger === 'winston',
    } as Record<string, unknown>;

    const files: TemplateFile[] = [
      {
        template: 'features/observability/observability.types.ts.ejs',
        out: (p) => join(p.root, 'observability.types.ts'),
      },
      {
        template: 'features/observability/correlation.ts.ejs',
        out: (p) => join(p.root, 'correlation.ts'),
      },
      {
        template: `features/observability/logging/${logger}.logger.ts.ejs`,
        out: (p) => join(p.logging, 'logger.ts'),
      },
      {
        template: 'features/observability/logging/context-logger.ts.ejs',
        out: (p) => join(p.logging, 'context-logger.ts'),
      },
      {
        template: 'features/observability/metrics/metrics.registry.ts.ejs',
        out: (p) => join(p.metrics, 'metrics.registry.ts'),
      },
      {
        template: 'features/observability/metrics/prometheus.ts.ejs',
        out: (p) => join(p.metrics, 'prometheus.ts'),
      },
      {
        template: 'features/observability/tracing/tracer.ts.ejs',
        out: (p) => join(p.tracing, 'tracer.ts'),
      },
      {
        template: 'features/observability/tracing/otel.ts.ejs',
        out: (p) => join(p.tracing, 'otel.ts'),
      },
      {
        template: 'features/observability/alerts/alert.manager.ts.ejs',
        out: (p) => join(p.alerts, 'alert.manager.ts'),
      },
      {
        template: 'features/observability/errors/sentry.monitor.ts.ejs',
        out: (p) => join(p.errors, 'sentry.monitor.ts'),
      },
      {
        template: 'features/observability/observability.service.ts.ejs',
        out: (p) => join(p.root, 'observability.service.ts'),
      },
      {
        template: 'features/observability/register-observability.ts.ejs',
        out: (p) => join(p.root, 'register-observability.ts'),
      },
      {
        template: 'features/observability/index.ts.ejs',
        out: (p) => join(p.root, 'index.ts'),
      },
      {
        template: 'features/observability/tests/observability.test.ts.ejs',
        out: () => join('tests', 'observability', 'observability.test.ts'),
      },
    ];

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
      'features/observability/OBSERVABILITY.md.ejs',
      { data: templateData },
    );
    if (!options.dryRun) {
      await fs.write('OBSERVABILITY.md', docContent);
      const envSection = `# OBSERVABILITY\n${getObservabilityEnvLines(options.appName, logger).join('\n')}\n`;
      await fs.append('.env.example', `\n${envSection}`);
    }
    written.push('OBSERVABILITY.md', '.env.example');

    const deps = getObservabilityDependencies(logger);
    return {
      files: written,
      dependencies: deps.dependencies,
      devDependencies: deps.devDependencies,
    };
  }
}

export function createObservabilityManager(options?: {
  cwd?: string;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
}): ObservabilityManager {
  return new ObservabilityManager(options);
}
