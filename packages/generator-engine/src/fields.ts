import { ValidationError } from '@mycli/core';
import type { FieldDefinition, MappedField } from './types.js';

/**
 * Parse CLI field specs:
 *   name:string,price:number,description:text,category:relation:Category,email?:email
 */
export function parseFields(input: string): FieldDefinition[] {
  return input
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const segments = part.split(':').map((s) => s.trim());
      let name = segments[0];
      if (!name) {
        throw new ValidationError(`Invalid field: ${part}`);
      }

      let optional = false;
      if (name.endsWith('?')) {
        optional = true;
        name = name.slice(0, -1);
      }

      const type = segments[1] ?? 'string';
      const related = type === 'relation' ? segments[2] : undefined;

      return {
        name,
        type,
        optional,
        relation: type === 'relation',
        related,
      };
    });
}

export function mapField(field: FieldDefinition): MappedField {
  const isRelation = field.type === 'relation' || Boolean(field.relation);
  const propertyName = isRelation
    ? field.name.endsWith('Id')
      ? field.name
      : `${field.name}Id`
    : field.name;

  const { tsType, swaggerType, swaggerFormat, sampleValue } = resolveTypes(field.type, isRelation);

  return {
    ...field,
    propertyName,
    tsType,
    swaggerType,
    swaggerFormat,
    sampleValue,
    isRelation,
  };
}

export function mapFields(fields: FieldDefinition[]): MappedField[] {
  return fields.map(mapField);
}

function resolveTypes(
  type: string,
  isRelation: boolean,
): {
  tsType: string;
  swaggerType: string;
  swaggerFormat?: string;
  sampleValue: string;
} {
  if (isRelation) {
    return {
      tsType: 'string',
      swaggerType: 'string',
      swaggerFormat: 'uuid',
      sampleValue: "'00000000-0000-0000-0000-000000000001'",
    };
  }

  switch (type) {
    case 'number':
    case 'float':
      return { tsType: 'number', swaggerType: 'number', sampleValue: '0' };
    case 'int':
      return { tsType: 'number', swaggerType: 'integer', sampleValue: '0' };
    case 'boolean':
      return { tsType: 'boolean', swaggerType: 'boolean', sampleValue: 'false' };
    case 'date':
      return {
        tsType: 'Date',
        swaggerType: 'string',
        swaggerFormat: 'date',
        sampleValue: 'new Date()',
      };
    case 'datetime':
      return {
        tsType: 'Date',
        swaggerType: 'string',
        swaggerFormat: 'date-time',
        sampleValue: 'new Date()',
      };
    case 'json':
      return {
        tsType: 'Record<string, unknown>',
        swaggerType: 'object',
        sampleValue: '{}',
      };
    case 'uuid':
      return {
        tsType: 'string',
        swaggerType: 'string',
        swaggerFormat: 'uuid',
        sampleValue: "'00000000-0000-0000-0000-000000000000'",
      };
    case 'email':
      return {
        tsType: 'string',
        swaggerType: 'string',
        swaggerFormat: 'email',
        sampleValue: "'user@example.com'",
      };
    case 'url':
      return {
        tsType: 'string',
        swaggerType: 'string',
        swaggerFormat: 'uri',
        sampleValue: "'https://example.com'",
      };
    case 'text':
      return { tsType: 'string', swaggerType: 'string', sampleValue: "'sample text'" };
    default:
      return { tsType: 'string', swaggerType: 'string', sampleValue: "'sample'" };
  }
}

export function defaultFields(): FieldDefinition[] {
  return [{ name: 'name', type: 'string' }];
}
