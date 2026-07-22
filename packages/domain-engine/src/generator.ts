import { join } from 'node:path';
import type {
  GeneratedFile,
  Generator,
  GeneratorContext,
  GeneratorResult,
} from '@mycli-cli/generator-engine';
import { buildNames } from '@mycli-cli/generator-engine';
import { resolveDomainEntityPaths } from './paths.js';

interface DomainTemplateFile {
  template: string;
  out: (
    paths: ReturnType<typeof resolveDomainEntityPaths>,
    names: ReturnType<typeof buildNames>,
  ) => string;
}

const DOMAIN_FILES: DomainTemplateFile[] = [
  {
    template: 'generators/domain/entities/Entity.ts.ejs',
    out: (p, n) => join(p.entities, `${n.pascal}.ts`),
  },
  {
    template: 'generators/domain/value-objects/Email.ts.ejs',
    out: (p) => join(p.valueObjects, 'Email.ts'),
  },
  {
    template: 'generators/domain/aggregates/Aggregate.ts.ejs',
    out: (p, n) => join(p.aggregates, `${n.pascal}Aggregate.ts`),
  },
  {
    template: 'generators/domain/events/CreatedEvent.ts.ejs',
    out: (p, n) => join(p.events, `${n.pascal}Created.ts`),
  },
  {
    template: 'generators/domain/application/CreateCommand.ts.ejs',
    out: (p, n) => join(p.commands, `Create${n.pascal}Command.ts`),
  },
  {
    template: 'generators/domain/application/GetQuery.ts.ejs',
    out: (p, n) => join(p.queries, `Get${n.pascal}Query.ts`),
  },
  {
    template: 'generators/domain/application/ApplicationService.ts.ejs',
    out: (p, n) => join(p.applicationServices, `${n.pascal}ApplicationService.ts`),
  },
  {
    template: 'generators/domain/infrastructure/RepositoryInterface.ts.ejs',
    out: (p, n) => join(p.repositoryInterfaces, `I${n.pascal}Repository.ts`),
  },
  {
    template: 'generators/domain/infrastructure/Repository.ts.ejs',
    out: (p, n) => join(p.repositories, `${n.pascal}Repository.ts`),
  },
  {
    template: 'generators/domain/index.ts.ejs',
    out: (p) => join(p.root, 'index.ts'),
  },
  {
    template: 'generators/domain/tests/domain.test.ts.ejs',
    out: (p, n) => join(p.root, 'tests', `${n.kebab}.domain.test.ts`),
  },
];

/**
 * DDD domain generator — entity, value objects, aggregate, events, application layer, repositories.
 * Domain layer templates contain zero framework/ORM imports.
 */
export function createDomainGenerator(): Generator {
  return {
    name: 'domain',
    description:
      'Generate a DDD domain module (entity, value objects, aggregate, events, commands, queries, repository)',
    aliases: ['dom', 'ddd'],
    autoRegister: false,
    async run(ctx: GeneratorContext): Promise<GeneratorResult> {
      const names = buildNames(ctx.name);
      const config = ctx.config.get();
      const pathConfig = config.paths as
        | {
            domain?: string;
            application?: string;
            infrastructure?: string;
          }
        | undefined;
      const paths = resolveDomainEntityPaths(names.kebab, {
        domain: pathConfig?.domain,
        application: pathConfig?.application,
        infrastructure: pathConfig?.infrastructure,
      });

      const language = config.language ?? 'typescript';
      const data = {
        ...names,
        language,
        hasEmail: true,
      };
      const templateData = data as unknown as Record<string, unknown>;

      const files: GeneratedFile[] = [];

      for (const spec of DOMAIN_FILES) {
        const destination = spec.out(paths, names);
        const content = await ctx.templates.renderFile(spec.template, { data: templateData });
        const exists = await ctx.fs.exists(destination);

        if (exists && !ctx.options.overwrite) {
          files.push({ path: destination, content, action: 'skip' });
          continue;
        }

        if (!ctx.dryRun) {
          await ctx.fs.write(destination, content, {
            overwrite: Boolean(ctx.options.overwrite) || !exists,
          });
        }

        files.push({
          path: destination,
          content,
          action: exists ? 'update' : 'create',
        });
      }

      return {
        generator: 'domain',
        name: ctx.name,
        files,
        registrations: [],
      };
    },
  };
}
