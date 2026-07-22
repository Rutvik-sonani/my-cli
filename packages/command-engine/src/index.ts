import type { ApplicationContext } from '@mycli/core';
import { CommandError, ValidationError } from '@mycli/core';

export type ArgumentType = 'string' | 'number' | 'boolean';

export interface ArgumentDefinition {
  name: string;
  description?: string;
  required?: boolean;
  type?: ArgumentType;
  variadic?: boolean;
}

export interface OptionDefinition {
  flags: string;
  description?: string;
  defaultValue?: unknown;
  required?: boolean;
  type?: ArgumentType;
  choices?: string[];
}

export interface CommandContext {
  app: ApplicationContext;
  args: Record<string, unknown>;
  options: Record<string, unknown>;
  rawArgs: string[];
  command: CommandDefinition;
}

export type CommandHandler = (ctx: CommandContext) => Promise<void> | void;

export interface CommandDefinition {
  name: string;
  description?: string;
  aliases?: string[];
  arguments?: ArgumentDefinition[];
  options?: OptionDefinition[];
  examples?: string[];
  hidden?: boolean;
  plugin?: string;
  handler: CommandHandler;
  subcommands?: CommandDefinition[];
}

export interface ParsedArgv {
  commandPath: string[];
  args: Record<string, unknown>;
  options: Record<string, unknown>;
  rawArgs: string[];
  helpRequested: boolean;
  versionRequested: boolean;
}

export interface CommandRegistryOptions {
  throwOnUnknown?: boolean;
}

/**
 * Command registry and argv parser for the `my` CLI.
 */
export class CommandRegistry {
  private readonly commands = new Map<string, CommandDefinition>();
  private readonly aliases = new Map<string, string>();
  private readonly throwOnUnknown: boolean;

  constructor(options: CommandRegistryOptions = {}) {
    this.throwOnUnknown = options.throwOnUnknown ?? true;
  }

  register(command: CommandDefinition): this {
    this.validateCommand(command);
    this.commands.set(command.name, command);
    for (const alias of command.aliases ?? []) {
      this.aliases.set(alias, command.name);
    }
    return this;
  }

  registerMany(commands: CommandDefinition[]): this {
    for (const command of commands) {
      this.register(command);
    }
    return this;
  }

  has(name: string): boolean {
    return this.commands.has(name) || this.aliases.has(name);
  }

  get(name: string): CommandDefinition | undefined {
    const resolved = this.aliases.get(name) ?? name;
    return this.commands.get(resolved);
  }

  list(options: { includeHidden?: boolean } = {}): CommandDefinition[] {
    return [...this.commands.values()].filter((cmd) => options.includeHidden || !cmd.hidden);
  }

  resolvePath(path: string[]): CommandDefinition | undefined {
    if (path.length === 0) {
      return undefined;
    }

    let current: CommandDefinition | undefined = this.get(path[0]!);
    if (!current) {
      return undefined;
    }

    for (let i = 1; i < path.length; i += 1) {
      const segment = path[i]!;
      const next: CommandDefinition | undefined = current.subcommands?.find(
        (sub) => sub.name === segment || sub.aliases?.includes(segment),
      );
      if (!next) {
        return current;
      }
      current = next;
    }

    return current;
  }

  parse(argv: string[]): ParsedArgv {
    const args = [...argv];
    const options: Record<string, unknown> = {};
    const positional: string[] = [];
    let helpRequested = false;
    let versionRequested = false;

    while (args.length > 0) {
      const token = args.shift()!;
      if (token === '--help' || token === '-h') {
        helpRequested = true;
        continue;
      }
      if (token === '--version' || token === '-V') {
        versionRequested = true;
        continue;
      }
      if (token === '--') {
        positional.push(...args);
        break;
      }
      if (token.startsWith('--')) {
        const [rawKey, inline] = token.slice(2).split('=');
        const key = camelizeOption(rawKey!);
        if (inline !== undefined) {
          options[key] = coerceValue(inline);
        } else if (args[0] && !args[0].startsWith('-')) {
          options[key] = coerceValue(args.shift()!);
        } else {
          options[key] = true;
        }
        continue;
      }
      if (token.startsWith('-') && token.length === 2) {
        const key = token.slice(1);
        if (args[0] && !args[0].startsWith('-')) {
          options[key] = coerceValue(args.shift()!);
        } else {
          options[key] = true;
        }
        continue;
      }
      positional.push(token);
    }

    const commandPath = this.extractCommandPath(positional);
    const command = this.resolvePath(commandPath);
    const remaining = positional.slice(commandPath.length);
    const mappedArgs = command ? this.mapArguments(command, remaining) : {};

    if (command) {
      this.applyOptionDefaults(command, options);
      this.validateOptions(command, options);
    } else if (
      commandPath.length > 0 &&
      this.throwOnUnknown &&
      !helpRequested &&
      !versionRequested
    ) {
      throw new CommandError(`Unknown command: ${commandPath.join(' ')}`, {
        code: 'COMMAND_NOT_FOUND',
        details: { command: commandPath.join(' ') },
      });
    }

    return {
      commandPath,
      args: mappedArgs,
      options,
      rawArgs: argv,
      helpRequested,
      versionRequested,
    };
  }

  async execute(app: ApplicationContext, argv: string[]): Promise<ParsedArgv> {
    const parsed = this.parse(argv);
    if (parsed.helpRequested || parsed.versionRequested) {
      return parsed;
    }

    const command = this.resolvePath(parsed.commandPath);
    if (!command) {
      throw new CommandError('No command specified', { code: 'COMMAND_NOT_FOUND' });
    }

    // If path resolves to a parent with unused segments that aren't args, prefer leaf
    const leaf = this.findLeafCommand(parsed.commandPath) ?? command;

    const started = Date.now();
    await app.events.emit('command:start', { name: leaf.name, args: argv });
    try {
      await leaf.handler({
        app,
        args: parsed.args,
        options: parsed.options,
        rawArgs: argv,
        command: leaf,
      });
      await app.events.emit('command:end', {
        name: leaf.name,
        durationMs: Date.now() - started,
        success: true,
      });
    } catch (error) {
      await app.events.emit('command:end', {
        name: leaf.name,
        durationMs: Date.now() - started,
        success: false,
      });
      throw error;
    }

    return parsed;
  }

  private findLeafCommand(path: string[]): CommandDefinition | undefined {
    if (path.length === 0) {
      return undefined;
    }
    let current: CommandDefinition | undefined = this.get(path[0]!);
    if (!current) {
      return undefined;
    }
    for (let i = 1; i < path.length; i += 1) {
      const next: CommandDefinition | undefined = current.subcommands?.find(
        (sub) => sub.name === path[i] || sub.aliases?.includes(path[i]!),
      );
      if (!next) {
        break;
      }
      current = next;
    }
    return current;
  }

  private extractCommandPath(positional: string[]): string[] {
    if (positional.length === 0) {
      return [];
    }

    const path: string[] = [];
    let current: CommandDefinition | undefined = this.get(positional[0]!);
    if (!current) {
      return [positional[0]!];
    }
    path.push(current.name);

    for (let i = 1; i < positional.length; i += 1) {
      const segment = positional[i]!;
      const next: CommandDefinition | undefined = current.subcommands?.find(
        (sub) => sub.name === segment || sub.aliases?.includes(segment),
      );
      if (!next) {
        break;
      }
      path.push(next.name);
      current = next;
    }

    return path;
  }

  private mapArguments(command: CommandDefinition, values: string[]): Record<string, unknown> {
    const defs = command.arguments ?? [];
    const result: Record<string, unknown> = {};
    let index = 0;

    for (const def of defs) {
      if (def.variadic) {
        result[def.name] = values.slice(index).map((v) => coerceTyped(v, def.type ?? 'string'));
        index = values.length;
        break;
      }
      const raw = values[index];
      if (raw === undefined) {
        if (def.required) {
          throw new ValidationError(`Missing required argument: ${def.name}`, {
            code: 'COMMAND_VALIDATION',
            details: { argument: def.name },
          });
        }
        continue;
      }
      result[def.name] = coerceTyped(raw, def.type ?? 'string');
      index += 1;
    }

    return result;
  }

  private applyOptionDefaults(command: CommandDefinition, options: Record<string, unknown>): void {
    for (const def of command.options ?? []) {
      const key = optionKey(def.flags);
      if (options[key] === undefined && def.defaultValue !== undefined) {
        options[key] = def.defaultValue;
      }
    }
  }

  private validateOptions(command: CommandDefinition, options: Record<string, unknown>): void {
    for (const def of command.options ?? []) {
      const key = optionKey(def.flags);
      const value = options[key];
      if (def.required && (value === undefined || value === null)) {
        throw new ValidationError(`Missing required option: ${def.flags}`, {
          code: 'COMMAND_VALIDATION',
          details: { option: def.flags },
        });
      }
      if (value !== undefined && def.choices && !def.choices.includes(String(value))) {
        throw new ValidationError(
          `Invalid value for ${def.flags}. Expected one of: ${def.choices.join(', ')}`,
          { code: 'COMMAND_VALIDATION', details: { option: def.flags, value } },
        );
      }
    }
  }

  private validateCommand(command: CommandDefinition): void {
    if (!command.name || /\s/.test(command.name)) {
      throw new ValidationError(`Invalid command name: ${command.name}`);
    }
    if (typeof command.handler !== 'function') {
      throw new ValidationError(`Command handler required for: ${command.name}`);
    }
    for (const sub of command.subcommands ?? []) {
      this.validateCommand(sub);
    }
  }
}

function coerceValue(value: string): string | number | boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value !== '' && !Number.isNaN(Number(value)) && /^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }
  return value;
}

function coerceTyped(value: string, type: ArgumentType): string | number | boolean {
  if (type === 'boolean') return value === 'true' || value === '1';
  if (type === 'number') {
    const n = Number(value);
    if (Number.isNaN(n)) {
      throw new ValidationError(`Expected number, got: ${value}`);
    }
    return n;
  }
  return value;
}

function camelizeOption(flag: string): string {
  return flag.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

function optionKey(flags: string): string {
  const long = flags
    .split(/[ ,|]+/)
    .map((f) => f.trim())
    .find((f) => f.startsWith('--'));
  if (long) {
    return camelizeOption(
      long
        .replace(/^--/, '')
        .replace(/<.*>/, '')
        .replace(/\[.*\]/, '')
        .trim(),
    );
  }
  const short = flags.match(/-([a-zA-Z])/)?.[1];
  return short ?? flags;
}

export function createCommandRegistry(options?: CommandRegistryOptions): CommandRegistry {
  return new CommandRegistry(options);
}

export function defineCommand(definition: CommandDefinition): CommandDefinition {
  return definition;
}
