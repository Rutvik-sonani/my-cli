import { camelCase, kebabCase, pascalCase, pluralize, singularize, snakeCase } from '@mycli/core';
import type { NameVariants } from './types.js';

export function buildNames(raw: string): NameVariants {
  const name = singularize(raw);
  return {
    raw,
    name,
    namePlural: pluralize(name),
    camel: camelCase(name),
    camelPlural: camelCase(pluralize(name)),
    pascal: pascalCase(name),
    pascalPlural: pascalCase(pluralize(name)),
    kebab: kebabCase(name),
    kebabPlural: kebabCase(pluralize(name)),
    snake: snakeCase(name),
    snakePlural: snakeCase(pluralize(name)),
    constant: snakeCase(name).toUpperCase(),
  };
}
