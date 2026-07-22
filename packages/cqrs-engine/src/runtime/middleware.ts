import type {
  BusMiddleware,
  CommandMessage,
  IntegrationEvent,
  QueryMessage,
} from '@mycli/enterprise-core';

export interface LoggerLike {
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

const defaultLogger: LoggerLike = {
  info(message, meta) {
    console.log(message, meta ?? '');
  },
  error(message, meta) {
    console.error(message, meta ?? '');
  },
};

export function createLoggingMiddleware(
  label: 'command' | 'query' | 'event',
  logger: LoggerLike = defaultLogger,
): BusMiddleware<CommandMessage | QueryMessage | IntegrationEvent> {
  return async (message, next) => {
    const started = Date.now();
    logger.info(`[cqrs:${label}] start`, { type: message.type });
    try {
      const result = await next();
      logger.info(`[cqrs:${label}] done`, { type: message.type, ms: Date.now() - started });
      return result;
    } catch (error) {
      logger.error(`[cqrs:${label}] failed`, {
        type: message.type,
        ms: Date.now() - started,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };
}

export type Validator<T> = (message: T) => void | Promise<void>;

export function createValidationMiddleware<T extends { type: string }>(
  validator: Validator<T>,
): BusMiddleware<T> {
  return async (message, next) => {
    await validator(message);
    return next();
  };
}
