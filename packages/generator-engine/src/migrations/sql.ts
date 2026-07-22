import type { MappedField, NameVariants } from '../types.js';

export type SqlDialect = 'postgresql' | 'mysql' | 'sqlite' | 'sqlserver';

export type DrizzleDialect = 'postgresql' | 'mysql' | 'sqlite';

export function toDrizzleDialect(dialect: SqlDialect): DrizzleDialect {
  if (dialect === 'mysql') return 'mysql';
  if (dialect === 'sqlite') return 'sqlite';
  return 'postgresql';
}

export function drizzleImportPath(dialect: DrizzleDialect): string {
  switch (dialect) {
    case 'mysql':
      return 'drizzle-orm/mysql-core';
    case 'sqlite':
      return 'drizzle-orm/sqlite-core';
    default:
      return 'drizzle-orm/pg-core';
  }
}

export function drizzleTableFn(dialect: DrizzleDialect): string {
  switch (dialect) {
    case 'mysql':
      return 'mysqlTable';
    case 'sqlite':
      return 'sqliteTable';
    default:
      return 'pgTable';
  }
}

export interface MigrationPlan {
  orm: string;
  files: Array<{ path: string; content: string }>;
  schemaUpdates?: Array<{ path: string; content: string; mergeContent?: string }>;
}

export function migrationTimestamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
  ].join('');
}

export function sqlColumnType(field: MappedField, dialect: SqlDialect): string {
  if (field.isRelation) {
    return dialect === 'mysql' ? 'CHAR(36)' : 'UUID';
  }

  switch (field.type) {
    case 'number':
    case 'float':
      return dialect === 'mysql' ? 'DOUBLE' : 'DOUBLE PRECISION';
    case 'int':
      return 'INTEGER';
    case 'boolean':
      return dialect === 'sqlite' ? 'INTEGER' : 'BOOLEAN';
    case 'text':
      return 'TEXT';
    case 'json':
      return dialect === 'postgresql' ? 'JSONB' : 'JSON';
    case 'date':
      return 'DATE';
    case 'datetime':
      return dialect === 'mysql' ? 'DATETIME' : 'TIMESTAMP';
    case 'uuid':
      return dialect === 'mysql' ? 'CHAR(36)' : 'UUID';
    default:
      return dialect === 'mysql' ? 'VARCHAR(255)' : 'TEXT';
  }
}

export function prismaFieldType(field: MappedField): string {
  if (field.isRelation) return 'String';
  switch (field.type) {
    case 'number':
    case 'float':
      return 'Float';
    case 'int':
      return 'Int';
    case 'boolean':
      return 'Boolean';
    case 'json':
      return 'Json';
    case 'date':
    case 'datetime':
      return 'DateTime';
    default:
      return 'String';
  }
}

export function buildCreateTableSql(
  names: NameVariants,
  fields: MappedField[],
  dialect: SqlDialect,
): string {
  const table = names.snakePlural;
  const lines: string[] = [`CREATE TABLE IF NOT EXISTS "${table}" (`];

  const idCol =
    dialect === 'mysql'
      ? '  id CHAR(36) NOT NULL PRIMARY KEY'
      : dialect === 'sqlite'
        ? '  id TEXT NOT NULL PRIMARY KEY'
        : '  id UUID NOT NULL PRIMARY KEY';

  lines.push(idCol);

  for (const field of fields) {
    const col = field.isRelation
      ? snakeCaseColumn(field.propertyName)
      : snakeCaseColumn(field.name);
    const type = sqlColumnType(field, dialect);
    const nullable = field.optional ? '' : ' NOT NULL';
    lines.push(`  ${quoteIdent(col, dialect)} ${type}${nullable}`);
  }

  const created =
    dialect === 'mysql'
      ? '  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP'
      : '  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP';
  const updated =
    dialect === 'mysql'
      ? '  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
      : '  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP';

  lines.push(created);
  lines.push(updated);
  lines.push(');');
  return `${lines.join(',\n')}\n`;
}

export function buildPrismaModelBlock(names: NameVariants, fields: MappedField[]): string {
  const lines: string[] = [`model ${names.pascal} {`, '  id        String   @id @default(uuid())'];

  for (const field of fields) {
    const prismaType = prismaFieldType(field);
    const optional = field.optional ? '?' : '';
    const attr = field.isRelation
      ? ` @map("${snakeCaseColumn(field.propertyName)}")`
      : field.name !== field.propertyName
        ? ` @map("${snakeCaseColumn(field.name)}")`
        : '';
    lines.push(`  ${field.propertyName} ${prismaType}${optional}${attr}`);
  }

  lines.push('  createdAt DateTime @default(now()) @map("created_at")');
  lines.push('  updatedAt DateTime @updatedAt @map("updated_at")');
  lines.push('');
  lines.push(`  @@map("${names.snakePlural}")`);
  lines.push('}');
  return `${lines.join('\n')}\n`;
}

export function buildDrizzleTableSnippet(
  names: NameVariants,
  fields: MappedField[],
  dialect: DrizzleDialect = 'postgresql',
): string {
  const tableFn = drizzleTableFn(dialect);
  const idDef =
    dialect === 'mysql'
      ? "  id: char('id', { length: 36 }).primaryKey(),"
      : dialect === 'sqlite'
        ? "  id: text('id').primaryKey(),"
        : "  id: uuid('id').primaryKey().defaultRandom(),";

  const lines: string[] = [
    `export const ${names.camelPlural} = ${tableFn}('${names.snakePlural}', {`,
    idDef,
  ];

  for (const field of fields) {
    const col = field.isRelation
      ? snakeCaseColumn(field.propertyName)
      : snakeCaseColumn(field.name);
    let def: string;
    if (field.isRelation || field.type === 'uuid') {
      def =
        dialect === 'mysql'
          ? `char('${col}', { length: 36 })`
          : dialect === 'sqlite'
            ? `text('${col}')`
            : `uuid('${col}')`;
    } else if (field.type === 'boolean') {
      def = dialect === 'sqlite' ? `integer('${col}', { mode: 'boolean' })` : `boolean('${col}')`;
    } else if (field.type === 'int' || field.type === 'number' || field.type === 'float') {
      def = dialect === 'mysql' ? `double('${col}')` : `integer('${col}')`;
    } else if (field.type === 'text' || field.type === 'json') {
      def = `text('${col}')`;
    } else {
      def = dialect === 'sqlite' ? `text('${col}')` : `varchar('${col}', { length: 255 })`;
    }
    if (!field.optional) def += '.notNull()';
    lines.push(`  ${field.propertyName}: ${def},`);
  }

  const tsType = dialect === 'sqlite' ? 'integer' : 'timestamp';
  const tsMode = dialect === 'sqlite' ? ", { mode: 'timestamp' }" : '';
  lines.push(`  createdAt: ${tsType}('created_at'${tsMode}).notNull().defaultNow(),`);
  lines.push(`  updatedAt: ${tsType}('updated_at'${tsMode}).notNull().defaultNow(),`);
  lines.push('});');
  return lines.join('\n');
}

export function buildDrizzleTableBlock(
  names: NameVariants,
  fields: MappedField[],
  dialect: DrizzleDialect = 'postgresql',
): string {
  const importPath = drizzleImportPath(dialect);
  const tableFn = drizzleTableFn(dialect);
  const imports = new Set([tableFn, 'timestamp']);
  if (dialect === 'postgresql') imports.add('uuid');
  if (dialect === 'mysql') imports.add('char');
  if (dialect === 'sqlite') imports.add('text');
  for (const field of fields) {
    if (field.type === 'boolean' && dialect !== 'sqlite') imports.add('boolean');
    if (field.type === 'int' || field.type === 'number' || field.type === 'float') {
      imports.add(dialect === 'mysql' ? 'double' : 'integer');
    }
    if (field.type === 'text' || field.type === 'json') imports.add('text');
    if (!field.isRelation && field.type === 'string' && dialect === 'postgresql')
      imports.add('varchar');
  }

  return `import { ${[...imports].join(', ')} } from '${importPath}';\n\n${buildDrizzleTableSnippet(names, fields, dialect)}\n`;
}

function snakeCaseColumn(name: string): string {
  return name.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`).replace(/^_/, '');
}

function quoteIdent(name: string, dialect: SqlDialect): string {
  if (dialect === 'mysql') return `\`${name}\``;
  return `"${name}"`;
}
