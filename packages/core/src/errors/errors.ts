import type { ErrorCode, ErrorDetails } from './types.js';

export class MyCliError extends Error {
  readonly code: ErrorCode;
  readonly details?: Record<string, unknown>;
  override readonly cause?: unknown;

  constructor(message: string, options: ErrorDetails = {}) {
    super(message);
    this.name = 'MyCliError';
    this.code = options.code ?? 'UNKNOWN';
    this.details = options.details;
    this.cause = options.cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
    };
  }
}

export class ConfigurationError extends MyCliError {
  constructor(message: string, options: ErrorDetails = {}) {
    super(message, { code: 'INVALID_CONFIG', ...options });
    this.name = 'ConfigurationError';
  }
}

export class PluginError extends MyCliError {
  constructor(message: string, options: ErrorDetails = {}) {
    super(message, { code: 'PLUGIN_LOAD_FAILED', ...options });
    this.name = 'PluginError';
  }
}

export class CommandError extends MyCliError {
  constructor(message: string, options: ErrorDetails = {}) {
    super(message, { code: 'COMMAND_FAILED', ...options });
    this.name = 'CommandError';
  }
}

export class GeneratorError extends MyCliError {
  constructor(message: string, options: ErrorDetails = {}) {
    super(message, { code: 'GENERATOR_FAILED', ...options });
    this.name = 'GeneratorError';
  }
}

export class TemplateError extends MyCliError {
  constructor(message: string, options: ErrorDetails = {}) {
    super(message, { code: 'TEMPLATE_RENDER_FAILED', ...options });
    this.name = 'TemplateError';
  }
}

export class FilesystemError extends MyCliError {
  constructor(message: string, options: ErrorDetails = {}) {
    super(message, { code: 'FILESYSTEM_ERROR', ...options });
    this.name = 'FilesystemError';
  }
}

export class DependencyError extends MyCliError {
  constructor(message: string, options: ErrorDetails = {}) {
    super(message, { code: 'DEPENDENCY_INSTALL_FAILED', ...options });
    this.name = 'DependencyError';
  }
}

export class ValidationError extends MyCliError {
  constructor(message: string, options: ErrorDetails = {}) {
    super(message, { code: 'VALIDATION_FAILED', ...options });
    this.name = 'ValidationError';
  }
}

export function isMyCliError(error: unknown): error is MyCliError {
  return error instanceof MyCliError;
}
