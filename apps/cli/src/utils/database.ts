import type { DatabaseManager } from '@mycli-cli/database-manager';
import { type DatabaseEngine, registerDatabasePlugin } from '@mycli-cli/database-manager';
import type { TemplateEngine } from '@mycli-cli/template-engine';

export function wireDatabasePlugin(
  db: DatabaseManager,
  database: DatabaseEngine,
  templates: TemplateEngine,
): void {
  registerDatabasePlugin(db, database, templates);
}
