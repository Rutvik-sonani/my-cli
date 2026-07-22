import type { LogLevel, LogTransport, LoggerOptions } from './types.js';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

class ConsoleTransport implements LogTransport {
  write(level: Exclude<LogLevel, 'silent'>, message: string, meta?: Record<string, unknown>): void {
    const fn =
      level === 'debug'
        ? console.debug
        : level === 'warn'
          ? console.warn
          : level === 'error'
            ? console.error
            : console.log;
    if (meta && Object.keys(meta).length > 0) {
      fn(message, meta);
      return;
    }
    fn(message);
  }
}

export class Logger {
  private level: LogLevel;
  private readonly name?: string;
  private readonly transports: LogTransport[];
  private readonly timestamps: boolean;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? 'info';
    this.name = options.name;
    this.transports = options.transports ?? [new ConsoleTransport()];
    this.timestamps = options.timestamps ?? false;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  child(name: string): Logger {
    const childName = this.name ? `${this.name}:${name}` : name;
    return new Logger({
      level: this.level,
      name: childName,
      transports: this.transports,
      timestamps: this.timestamps,
    });
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log('debug', message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log('warn', message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.log('error', message, meta);
  }

  private log(
    level: Exclude<LogLevel, 'silent'>,
    message: string,
    meta?: Record<string, unknown>,
  ): void {
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[this.level]) {
      return;
    }

    const parts: string[] = [];
    if (this.timestamps) {
      parts.push(new Date().toISOString());
    }
    parts.push(`[${level.toUpperCase()}]`);
    if (this.name) {
      parts.push(`[${this.name}]`);
    }
    parts.push(message);

    const formatted = parts.join(' ');
    for (const transport of this.transports) {
      transport.write(level, formatted, meta);
    }
  }
}

export function createLogger(options?: LoggerOptions): Logger {
  return new Logger(options);
}
