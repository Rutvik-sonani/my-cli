import type { Err, Ok, Result as ResultType } from './types.js';

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

export const Result = {
  ok,
  err,
  isOk<T, E>(result: ResultType<T, E>): result is Ok<T> {
    return result.ok;
  },
  isErr<T, E>(result: ResultType<T, E>): result is Err<E> {
    return !result.ok;
  },
  map<T, U, E>(result: ResultType<T, E>, fn: (value: T) => U): ResultType<U, E> {
    return result.ok ? ok(fn(result.value)) : result;
  },
  mapErr<T, E, F>(result: ResultType<T, E>, fn: (error: E) => F): ResultType<T, F> {
    return result.ok ? result : err(fn(result.error));
  },
  unwrap<T, E>(result: ResultType<T, E>): T {
    if (!result.ok) {
      throw result.error;
    }
    return result.value;
  },
  unwrapOr<T, E>(result: ResultType<T, E>, fallback: T): T {
    return result.ok ? result.value : fallback;
  },
};
