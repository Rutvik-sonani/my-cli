import {
  type CommandDefinition,
  type CommandRegistry,
  createCommandRegistry,
} from '@mycli/command-engine';
import { type ConfigManager, createConfigManager } from '@mycli/config-manager';
import { ApplicationContext, isMyCliError } from '@mycli/core';
import type { ApplicationContextOptions } from '@mycli/core';
import { createFileSystem } from '@mycli/filesystem';
import { type PluginManager, createPluginManager } from '@mycli/plugin-system';
import { type I18n, type PromptEngine, createI18n, createPromptEngine } from '@mycli/prompt-engine';
import { type TelemetryManager, createTelemetryManager } from '@mycli/telemetry-manager';
import pc from 'picocolors';

export interface CliEngineOptions extends ApplicationContextOptions {
  name?: string;
  binName?: string;
  commands?: CommandDefinition[];
  discoverPlugins?: boolean;
  i18n?: I18n;
}

export interface CliRunResult {
  exitCode: number;
  commandPath: string[];
}

/**
 * Top-level CLI orchestrator that wires context, config, plugins, prompts, and commands.
 */
export class CliEngine {
  readonly app: ApplicationContext;
  readonly commands: CommandRegistry;
  readonly prompts: PromptEngine;
  readonly config: ConfigManager;
  readonly plugins: PluginManager;
  telemetry: TelemetryManager;
  readonly binName: string;
  readonly name: string;
  readonly i18n: I18n;

  constructor(options: CliEngineOptions = {}) {
    this.name = options.name ?? 'MyCLI';
    this.binName = options.binName ?? 'my';
    this.i18n = options.i18n ?? createI18n();
    this.app = new ApplicationContext(options);
    this.commands = createCommandRegistry({ throwOnUnknown: true });
    this.prompts = createPromptEngine({ interactive: this.app.interactive, i18n: this.i18n });
    this.config = createConfigManager({
      cwd: this.app.cwd,
      configPath: options.configPath,
      filesystem: createFileSystem(this.app.cwd),
    });
    this.plugins = createPluginManager({
      app: this.app,
      config: this.config,
      filesystem: createFileSystem(this.app.cwd),
    });
    this.telemetry = createTelemetryManager({ cliVersion: this.app.version });

    if (options.commands) {
      this.commands.registerMany(options.commands);
    }
  }

  registerCommands(commands: CommandDefinition[]): this {
    this.commands.registerMany(commands);
    return this;
  }

  async initialize(options: { discoverPlugins?: boolean } = {}): Promise<void> {
    await this.app.boot();
    await this.config.load();
    this.telemetry = createTelemetryManager({
      config: this.config,
      cliVersion: this.app.version,
    });

    if (options.discoverPlugins ?? true) {
      try {
        await this.plugins.discover();
        this.commands.registerMany(this.plugins.getCommands());
      } catch (error) {
        this.app.logger.warn('Plugin discovery failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  async run(argv: string[] = process.argv.slice(2)): Promise<CliRunResult> {
    try {
      if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
        if (
          argv.length === 0 ||
          (argv.length === 1 && (argv[0] === '--help' || argv[0] === '-h'))
        ) {
          this.printHelp();
          return { exitCode: 0, commandPath: [] };
        }
      }

      if (argv.includes('--version') || argv.includes('-V')) {
        this.printVersion();
        return { exitCode: 0, commandPath: [] };
      }

      const parsed = await this.commands.execute(this.app, argv);
      return { exitCode: 0, commandPath: parsed.commandPath };
    } catch (error) {
      this.handleError(error);
      return { exitCode: 1, commandPath: [] };
    }
  }

  printHelp(): void {
    const commands = this.commands.list();
    console.log();
    console.log(`  ${pc.bold(this.name)} ${pc.dim(`v${this.app.version}`)}`);
    console.log();
    console.log(`  ${pc.dim('Usage:')}`);
    console.log(`    ${this.binName} <command> [options]`);
    console.log();
    console.log(`  ${pc.dim('Commands:')}`);
    const width = Math.max(...commands.map((c) => c.name.length), 8);
    for (const command of commands) {
      const desc = command.description ?? '';
      console.log(`    ${pc.cyan(command.name.padEnd(width))}  ${desc}`);
    }
    console.log();
    console.log(
      `  ${pc.dim('Run')} ${pc.cyan(`${this.binName} <command> --help`)} ${pc.dim('for details.')}`,
    );
    console.log();
  }

  printVersion(): void {
    console.log(`${this.binName}/${this.app.version}`);
  }

  printCommandHelp(command: CommandDefinition): void {
    console.log();
    console.log(`  ${pc.bold(command.name)}`);
    if (command.description) {
      console.log(`  ${command.description}`);
    }
    console.log();
    if (command.arguments?.length) {
      console.log(`  ${pc.dim('Arguments:')}`);
      for (const arg of command.arguments) {
        const req = arg.required ? '' : pc.dim(' (optional)');
        console.log(`    ${arg.name}${req}  ${arg.description ?? ''}`);
      }
      console.log();
    }
    if (command.options?.length) {
      console.log(`  ${pc.dim('Options:')}`);
      for (const opt of command.options) {
        console.log(`    ${opt.flags}  ${opt.description ?? ''}`);
      }
      console.log();
    }
    if (command.examples?.length) {
      console.log(`  ${pc.dim('Examples:')}`);
      for (const example of command.examples) {
        console.log(`    ${pc.cyan(example)}`);
      }
      console.log();
    }
  }

  async shutdown(): Promise<void> {
    try {
      await this.telemetry.flush();
    } catch (error) {
      this.app.logger.warn('Telemetry flush failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    await this.app.shutdown();
  }

  private handleError(error: unknown): void {
    if (isMyCliError(error)) {
      console.error(pc.red(`✖ ${error.message}`));
      if (this.app.verbose && error.details) {
        console.error(pc.dim(JSON.stringify(error.details, null, 2)));
      }
      return;
    }
    if (error instanceof Error) {
      console.error(pc.red(`✖ ${error.message}`));
      if (this.app.verbose && error.stack) {
        console.error(pc.dim(error.stack));
      }
      return;
    }
    console.error(pc.red(`✖ ${String(error)}`));
  }
}

export function createCliEngine(options?: CliEngineOptions): CliEngine {
  return new CliEngine(options);
}
