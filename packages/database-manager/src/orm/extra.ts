import { createFileSystem } from '@mycli/filesystem';
import type { TemplateEngine } from '@mycli/template-engine';
import { buildTemplateData } from '../env.js';
import type { DatabaseSetupOptions, OrmGenerator } from '../types.js';

async function writeTemplateFiles(
  options: DatabaseSetupOptions,
  templates: TemplateEngine,
  files: Array<{ template: string; out: string }>,
): Promise<string[]> {
  const cwd = options.cwd ?? process.cwd();
  const fs = createFileSystem(cwd);
  const data = buildTemplateData(options);
  const written: string[] = [];

  for (const file of files) {
    const content = await templates.renderFile(file.template, { data });
    if (!options.dryRun) {
      await fs.write(file.out, content);
    }
    written.push(file.out);
  }

  return written;
}

const TYPEORM_RBAC_FILES: Array<{ template: string; out: string }> = [
  {
    template: 'features/database/typeorm/entities/role.entity.ts.ejs',
    out: 'src/database/entities/role.entity.ts',
  },
  {
    template: 'features/database/typeorm/entities/permission.entity.ts.ejs',
    out: 'src/database/entities/permission.entity.ts',
  },
  {
    template: 'features/database/typeorm/entities/role-permission.entity.ts.ejs',
    out: 'src/database/entities/role-permission.entity.ts',
  },
  {
    template: 'features/database/typeorm/entities/user-role.entity.ts.ejs',
    out: 'src/database/entities/user-role.entity.ts',
  },
];

const MONGOOSE_RBAC_FILES: Array<{ template: string; out: string }> = [
  {
    template: 'features/database/mongoose/models/role.model.ts.ejs',
    out: 'src/database/models/role.model.ts',
  },
  {
    template: 'features/database/mongoose/models/permission.model.ts.ejs',
    out: 'src/database/models/permission.model.ts',
  },
  {
    template: 'features/database/mongoose/models/role-permission.model.ts.ejs',
    out: 'src/database/models/role-permission.model.ts',
  },
  {
    template: 'features/database/mongoose/models/user-role.model.ts.ejs',
    out: 'src/database/models/user-role.model.ts',
  },
];

const SEQUELIZE_RBAC_FILES: Array<{ template: string; out: string }> = [
  {
    template: 'features/database/sequelize/models/role.model.ts.ejs',
    out: 'src/database/sequelize/models/role.model.ts',
  },
  {
    template: 'features/database/sequelize/models/permission.model.ts.ejs',
    out: 'src/database/sequelize/models/permission.model.ts',
  },
  {
    template: 'features/database/sequelize/models/role-permission.model.ts.ejs',
    out: 'src/database/sequelize/models/role-permission.model.ts',
  },
  {
    template: 'features/database/sequelize/models/user-role.model.ts.ejs',
    out: 'src/database/sequelize/models/user-role.model.ts',
  },
];

const MIKROORM_RBAC_FILES: Array<{ template: string; out: string }> = [
  {
    template: 'features/database/mikroorm/entities/role.entity.ts.ejs',
    out: 'src/database/entities/role.entity.ts',
  },
  {
    template: 'features/database/mikroorm/entities/permission.entity.ts.ejs',
    out: 'src/database/entities/permission.entity.ts',
  },
  {
    template: 'features/database/mikroorm/entities/role-permission.entity.ts.ejs',
    out: 'src/database/entities/role-permission.entity.ts',
  },
  {
    template: 'features/database/mikroorm/entities/user-role.entity.ts.ejs',
    out: 'src/database/entities/user-role.entity.ts',
  },
];

export class TypeOrmGenerator implements OrmGenerator {
  readonly orm = 'typeorm' as const;

  async generate(options: DatabaseSetupOptions, templates: TemplateEngine): Promise<string[]> {
    const files = [
      {
        template: 'features/database/typeorm/data-source.ts.ejs',
        out: 'src/database/data-source.ts',
      },
      {
        template: 'features/database/typeorm/entities/user.entity.ts.ejs',
        out: 'src/database/entities/user.entity.ts',
      },
      { template: 'features/database/typeorm/seed.ts.ejs', out: 'src/database/seed.ts' },
    ];
    if (options.includeRbac) {
      files.push(...TYPEORM_RBAC_FILES);
    }
    return writeTemplateFiles(options, templates, files);
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

    return {
      dependencies: {
        typeorm: '^0.3.20',
        'reflect-metadata': '^0.2.2',
        [driver]: driver === 'pg' ? '^8.13.1' : driver === 'mysql2' ? '^3.12.0' : '^11.8.1',
      },
      devDependencies: {
        tsx: '^4.19.2',
      },
    };
  }
}

export class MongooseOrmGenerator implements OrmGenerator {
  readonly orm = 'mongoose' as const;

  async generate(options: DatabaseSetupOptions, templates: TemplateEngine): Promise<string[]> {
    const files = [
      {
        template: 'features/database/mongoose/connection.ts.ejs',
        out: 'src/database/connection.ts',
      },
      {
        template: 'features/database/mongoose/models/user.model.ts.ejs',
        out: 'src/database/models/user.model.ts',
      },
      { template: 'features/database/mongoose/seed.ts.ejs', out: 'src/database/seed.ts' },
    ];
    if (options.includeRbac) {
      files.push(...MONGOOSE_RBAC_FILES);
    }
    return writeTemplateFiles(options, templates, files);
  }

  dependencies() {
    return {
      dependencies: { mongoose: '^8.9.3' },
      devDependencies: {
        tsx: '^4.19.2',
      },
    };
  }
}

export class SequelizeOrmGenerator implements OrmGenerator {
  readonly orm = 'sequelize' as const;

  async generate(options: DatabaseSetupOptions, templates: TemplateEngine): Promise<string[]> {
    const files = [
      {
        template: 'features/database/sequelize/config.ts.ejs',
        out: 'src/database/sequelize/config.ts',
      },
      {
        template: 'features/database/sequelize/models/user.model.ts.ejs',
        out: 'src/database/sequelize/models/user.model.ts',
      },
      { template: 'features/database/sequelize/seed.ts.ejs', out: 'src/database/seed.ts' },
    ];
    if (options.includeRbac) {
      files.push(...SEQUELIZE_RBAC_FILES);
    }
    return writeTemplateFiles(options, templates, files);
  }

  dependencies(options: DatabaseSetupOptions) {
    const dialect = options.database;
    const driver =
      dialect === 'mysql' || dialect === 'mariadb'
        ? 'mysql2'
        : dialect === 'sqlite'
          ? 'sqlite3'
          : dialect === 'sqlserver'
            ? 'tedious'
            : 'pg';

    return {
      dependencies: {
        sequelize: '^6.37.5',
        [driver]: driver === 'pg' ? '^8.13.1' : driver === 'mysql2' ? '^3.12.0' : '^12.0.0',
      },
      devDependencies: {
        tsx: '^4.19.2',
      },
    };
  }
}

export class MikroOrmGenerator implements OrmGenerator {
  readonly orm = 'mikroorm' as const;

  async generate(options: DatabaseSetupOptions, templates: TemplateEngine): Promise<string[]> {
    const files = [
      {
        template: 'features/database/mikroorm/mikro-orm.config.ts.ejs',
        out: 'src/database/mikro-orm.config.ts',
      },
      {
        template: 'features/database/mikroorm/entities/user.entity.ts.ejs',
        out: 'src/database/entities/user.entity.ts',
      },
      { template: 'features/database/mikroorm/seed.ts.ejs', out: 'src/database/seed.ts' },
    ];
    if (options.includeRbac) {
      files.push(...MIKROORM_RBAC_FILES);
    }
    return writeTemplateFiles(options, templates, files);
  }

  dependencies(options: DatabaseSetupOptions) {
    const pkg =
      options.database === 'mongodb'
        ? '@mikro-orm/mongodb'
        : options.database === 'mysql' || options.database === 'mariadb'
          ? '@mikro-orm/mysql'
          : options.database === 'sqlite'
            ? '@mikro-orm/sqlite'
            : '@mikro-orm/postgresql';

    return {
      dependencies: {
        '@mikro-orm/core': '^6.4.2',
        [pkg]: '^6.4.2',
      },
      devDependencies: {
        '@mikro-orm/cli': '^6.4.2',
        '@mikro-orm/migrations': '^6.4.2',
        tsx: '^4.19.2',
      },
    };
  }
}
