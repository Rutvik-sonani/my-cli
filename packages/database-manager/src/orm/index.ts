import { createFileSystem } from '@mycli-cli/filesystem';
import type { TemplateEngine } from '@mycli-cli/template-engine';
import { buildTemplateData, drizzleTemplateSuffix } from '../env.js';
import type { DatabaseSetupOptions, OrmGenerator } from '../types.js';
import {
  MikroOrmGenerator,
  MongooseOrmGenerator,
  SequelizeOrmGenerator,
  TypeOrmGenerator,
} from './extra.js';

export class PrismaOrmGenerator implements OrmGenerator {
  readonly orm = 'prisma' as const;

  async generate(options: DatabaseSetupOptions, templates: TemplateEngine): Promise<string[]> {
    const cwd = options.cwd ?? process.cwd();
    const fs = createFileSystem(cwd);
    const data = buildTemplateData(options);
    const written: string[] = [];

    const files = [
      { template: 'features/database/prisma/schema.prisma.ejs', out: 'prisma/schema.prisma' },
      { template: 'features/database/prisma/seed.ts.ejs', out: 'prisma/seed.ts' },
      { template: 'features/database/prisma/client.ts.ejs', out: 'src/database/prisma.client.ts' },
    ];

    for (const file of files) {
      const content = await templates.renderFile(file.template, { data });
      if (!options.dryRun) {
        await fs.write(file.out, content);
      }
      written.push(file.out);
    }

    return written;
  }

  dependencies(_options: DatabaseSetupOptions) {
    return {
      dependencies: {
        '@prisma/client': '^6.2.1',
      },
      devDependencies: {
        prisma: '^6.2.1',
        tsx: '^4.19.2',
      },
    };
  }
}

export class DrizzleOrmGenerator implements OrmGenerator {
  readonly orm = 'drizzle' as const;

  async generate(options: DatabaseSetupOptions, templates: TemplateEngine): Promise<string[]> {
    const cwd = options.cwd ?? process.cwd();
    const fs = createFileSystem(cwd);
    const data = buildTemplateData(options);
    const written: string[] = [];
    const suffix = drizzleTemplateSuffix(options.database);

    const files = [
      {
        template: `features/database/drizzle/schema.${suffix}.ts.ejs`,
        out: 'src/database/schema.ts',
      },
      {
        template: `features/database/drizzle/client.${suffix}.ts.ejs`,
        out: 'src/database/client.ts',
      },
      { template: 'features/database/drizzle/drizzle.config.ts.ejs', out: 'drizzle.config.ts' },
      { template: 'features/database/drizzle/seed.ts.ejs', out: 'src/database/seed.ts' },
    ];

    for (const file of files) {
      const content = await templates.renderFile(file.template, { data });
      if (!options.dryRun) {
        await fs.write(file.out, content);
      }
      written.push(file.out);
    }

    return written;
  }

  dependencies(options: DatabaseSetupOptions) {
    const driver =
      options.database === 'mysql' || options.database === 'mariadb'
        ? 'mysql2'
        : options.database === 'sqlite'
          ? 'better-sqlite3'
          : options.database === 'sqlserver'
            ? 'mssql'
            : 'pg';

    const driverVersion =
      driver === 'pg'
        ? '^8.13.1'
        : driver === 'mysql2'
          ? '^3.12.0'
          : driver === 'mssql'
            ? '^11.0.1'
            : '^11.8.1';

    return {
      dependencies: {
        'drizzle-orm': '^0.38.4',
        [driver]: driverVersion,
      },
      devDependencies: {
        'drizzle-kit': '^0.30.1',
        tsx: '^4.19.2',
      },
    };
  }
}

export function createOrmGenerators(): OrmGenerator[] {
  return [
    new PrismaOrmGenerator(),
    new DrizzleOrmGenerator(),
    new TypeOrmGenerator(),
    new MongooseOrmGenerator(),
    new SequelizeOrmGenerator(),
    new MikroOrmGenerator(),
  ];
}

export function getOrmGenerator(orm: string, generators: OrmGenerator[]): OrmGenerator | undefined {
  return generators.find((g) => g.orm === orm);
}

export {
  TypeOrmGenerator,
  MongooseOrmGenerator,
  SequelizeOrmGenerator,
  MikroOrmGenerator,
} from './extra.js';
