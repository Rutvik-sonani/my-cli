import { ValidationError } from '../errors/errors.js';

export function assertNever(value: never, message = 'Unexpected value'): never {
  throw new ValidationError(`${message}: ${String(value)}`);
}

export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new ValidationError(message, { code: 'VALIDATION_FAILED' });
  }
}

export function ensure<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) {
    throw new ValidationError(message);
  }
  return value;
}
