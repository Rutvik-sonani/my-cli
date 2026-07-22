/**
 * @mycli-cli/core
 *
 * Application context, dependency injection, events, logging, and error handling.
 * All other MyCLI packages depend on this foundation.
 */

export { Container } from './di/container.js';
export type { ServiceFactory, ServiceIdentifier, Disposable } from './di/types.js';

export { EventBus } from './events/event-bus.js';
export type { EventHandler, EventMap, Unsubscribe } from './events/types.js';

export { createLogger, Logger } from './logger/logger.js';
export type { LogLevel, LoggerOptions, LogTransport } from './logger/types.js';

export {
  MyCliError,
  ConfigurationError,
  PluginError,
  CommandError,
  GeneratorError,
  TemplateError,
  FilesystemError,
  DependencyError,
  ValidationError,
  isMyCliError,
} from './errors/errors.js';
export type { ErrorCode, ErrorDetails } from './errors/types.js';

export { ApplicationContext, TOKENS } from './context/application-context.js';
export type { CoreEvents } from './context/application-context.js';
export type { ApplicationContextOptions, RuntimeEnvironment } from './context/types.js';

export { Result, ok, err } from './result/result.js';
export type { Ok, Err, Result as ResultType } from './result/types.js';

export { assertNever, invariant, ensure } from './utils/assert.js';
export {
  kebabCase,
  camelCase,
  pascalCase,
  snakeCase,
  pluralize,
  singularize,
} from './utils/string.js';
export { deepMerge } from './utils/merge.js';
