import type { FileSystem } from '@mycli-cli/filesystem';
import type { MappedField, NameVariants, RegistrationResult } from '../types.js';

/**
 * Merges generated entity schemas into openapi.json when the file exists.
 */
export async function ensureOpenApiRegistration(options: {
  fs: FileSystem;
  names: NameVariants;
  fields?: MappedField[];
  openApiPath?: string;
  dryRun?: boolean;
}): Promise<RegistrationResult | undefined> {
  const openApiPath = options.openApiPath ?? 'openapi.json';
  if (!(await options.fs.exists(openApiPath))) {
    return undefined;
  }

  const doc = await options.fs.readJson<{
    openapi?: string;
    info?: unknown;
    paths?: Record<string, unknown>;
    components?: { schemas?: Record<string, unknown> };
  }>(openApiPath);

  const schemaName = options.names.pascal;
  const properties: Record<string, unknown> = {
    id: { type: 'string', format: 'uuid' },
  };

  for (const field of options.fields ?? []) {
    const prop: Record<string, unknown> = { type: field.swaggerType };
    if (field.swaggerFormat) {
      prop.format = field.swaggerFormat;
    }
    properties[field.propertyName] = prop;
  }

  properties.createdAt = { type: 'string', format: 'date-time' };
  properties.updatedAt = { type: 'string', format: 'date-time' };

  doc.components = doc.components ?? {};
  doc.components.schemas = doc.components.schemas ?? {};
  const already = Boolean(doc.components.schemas[schemaName]);
  doc.components.schemas[schemaName] = {
    type: 'object',
    properties,
    required: [
      'id',
      ...(options.fields ?? []).filter((f) => !f.optional).map((f) => f.propertyName),
    ],
  };

  const base = `/${options.names.kebabPlural}`;
  doc.paths = doc.paths ?? {};
  doc.paths[base] = {
    get: {
      tags: [schemaName],
      summary: `List ${options.names.namePlural}`,
      responses: { '200': { description: 'OK' } },
    },
    post: {
      tags: [schemaName],
      summary: `Create ${options.names.name}`,
      responses: { '201': { description: 'Created' } },
    },
  };
  doc.paths[`${base}/{id}`] = {
    get: {
      tags: [schemaName],
      summary: `Get ${options.names.name}`,
      responses: { '200': { description: 'OK' } },
    },
    patch: {
      tags: [schemaName],
      summary: `Update ${options.names.name}`,
      responses: { '200': { description: 'OK' } },
    },
    delete: {
      tags: [schemaName],
      summary: `Delete ${options.names.name}`,
      responses: { '204': { description: 'No Content' } },
    },
  };

  if (!options.dryRun) {
    await options.fs.writeJson(openApiPath, doc, { overwrite: true });
  }

  return {
    kind: 'openapi',
    path: openApiPath,
    action: already ? 'update' : 'create',
    detail: schemaName,
  };
}
