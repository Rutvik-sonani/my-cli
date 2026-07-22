import { Container } from '../di/container.js';
import { EventBus } from '../events/event-bus.js';
import { type Logger, createLogger } from '../logger/logger.js';
import type { ApplicationContextOptions, RuntimeEnvironment } from './types.js';

export const TOKENS = {
  ApplicationContext: Symbol.for('mycli.ApplicationContext'),
  Logger: Symbol.for('mycli.Logger'),
  EventBus: Symbol.for('mycli.EventBus'),
  Container: Symbol.for('mycli.Container'),
} as const;

export interface CoreEvents {
  'app:boot': { version: string };
  'app:ready': { cwd: string };
  'app:shutdown': { reason?: string };
  'command:start': { name: string; args: string[] };
  'command:end': { name: string; durationMs: number; success: boolean };
  'plugin:loaded': { name: string; version: string };
  'generator:start': { name: string };
  'generator:end': { name: string; filesWritten: number };
  [event: string]: unknown;
}

/**
 * Root application context shared across engines, plugins, and commands.
 */
export class ApplicationContext {
  readonly cwd: string;
  readonly version: string;
  readonly environment: RuntimeEnvironment;
  readonly interactive: boolean;
  readonly verbose: boolean;
  readonly dryRun: boolean;
  readonly configPath?: string;
  readonly meta: Record<string, unknown>;
  readonly container: Container;
  readonly events: EventBus<CoreEvents>;
  readonly logger: Logger;
  private booted = false;

  constructor(options: ApplicationContextOptions = {}) {
    this.cwd = options.cwd ?? process.cwd();
    this.version = options.version ?? '1.0.0';
    this.environment = options.environment ?? detectEnvironment();
    this.interactive = options.interactive ?? Boolean(process.stdin.isTTY);
    this.verbose = options.verbose ?? false;
    this.dryRun = options.dryRun ?? false;
    this.configPath = options.configPath;
    this.meta = { ...(options.meta ?? {}) };

    this.container = new Container();
    this.events = new EventBus<CoreEvents>();
    this.logger = createLogger({
      name: 'mycli',
      level:
        options.logLevel ??
        (this.verbose ? 'debug' : this.environment === 'test' ? 'error' : 'info'),
    });

    this.container.registerInstance(TOKENS.ApplicationContext, this);
    this.container.registerInstance(TOKENS.Logger, this.logger);
    this.container.registerInstance(TOKENS.EventBus, this.events);
    this.container.registerInstance(TOKENS.Container, this.container);
  }

  async boot(): Promise<void> {
    if (this.booted) {
      return;
    }
    this.booted = true;
    await this.events.emit('app:boot', { version: this.version });
    await this.events.emit('app:ready', { cwd: this.cwd });
    this.logger.debug('Application context booted', {
      cwd: this.cwd,
      version: this.version,
      environment: this.environment,
    });
  }

  async shutdown(reason?: string): Promise<void> {
    await this.events.emit('app:shutdown', { reason });
    await this.container.dispose();
    this.booted = false;
  }

  isBooted(): boolean {
    return this.booted;
  }

  withCwd(cwd: string): ApplicationContext {
    return new ApplicationContext({
      cwd,
      version: this.version,
      environment: this.environment,
      logLevel: this.logger.getLevel(),
      interactive: this.interactive,
      verbose: this.verbose,
      dryRun: this.dryRun,
      configPath: this.configPath,
      meta: this.meta,
    });
  }
}

function detectEnvironment(): RuntimeEnvironment {
  const value = process.env.NODE_ENV;
  if (value === 'production' || value === 'test') {
    return value;
  }
  return 'development';
}
