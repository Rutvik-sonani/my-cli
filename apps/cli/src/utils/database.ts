import type { DatabaseManager } from '@mycli/database-manager';
import { type DatabaseEngine, registerDatabasePlugin } from '@mycli/database-manager';
import type { TemplateEngine } from '@mycli/template-engine';

export function wireDatabasePlugin(
  db: DatabaseManager,
  database: DatabaseEngine,
  templates: TemplateEngine,
): void {
  registerDatabasePlugin(db, database, templates);
}
