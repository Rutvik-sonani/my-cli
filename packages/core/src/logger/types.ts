export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export interface LogTransport {
  write(level: Exclude<LogLevel, 'silent'>, message: string, meta?: Record<string, unknown>): void;
}

export interface LoggerOptions {
  level?: LogLevel;
  name?: string;
  transports?: LogTransport[];
  timestamps?: boolean;
}
