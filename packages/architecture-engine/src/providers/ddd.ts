import { defineEnterpriseProvider, enterpriseTemplate } from './base.js';

const STYLE = 'domain-driven-design' as const;

export const dddProvider = defineEnterpriseProvider({
  style: STYLE,
  label: 'Domain Driven Design',
  description:
    'DDD tactical patterns — entities, value objects, aggregates, domain events, and bounded contexts.',
  modulePaths: {
    modules: 'src/domain',
    domain: 'src/domain',
    application: 'src/application',
    infrastructure: 'src/infrastructure',
  },
  dependencyRules: [
    {
      layer: 'Domain',
      path: 'src/domain',
      mayImport: ['src/domain'],
      mustNotImport: [
        'src/application',
        'src/infrastructure',
        'src/database',
        'fastify',
        'express',
        '@prisma',
      ],
      description: 'Domain layer is the center — no database, framework, or external API imports.',
    },
    {
      layer: 'Application',
      path: 'src/application',
      mayImport: ['src/domain'],
      mustNotImport: ['src/infrastructure/database', 'fastify', 'express'],
      description: 'Application coordinates domain objects via commands and queries.',
    },
    {
      layer: 'Infrastructure',
      path: 'src/infrastructure',
      mayImport: ['src/domain', 'src/application'],
      mustNotImport: ['src/domain/entities'],
      description: 'Repositories implement domain interfaces; they live in infrastructure.',
    },
  ],
  files: [
    enterpriseTemplate(STYLE, 'ARCHITECTURE.md.ejs', 'ARCHITECTURE.md'),
    enterpriseTemplate(STYLE, 'src/domain/entities/README.md.ejs', 'src/domain/entities/README.md'),
    enterpriseTemplate(
      STYLE,
      'src/domain/value-objects/README.md.ejs',
      'src/domain/value-objects/README.md',
    ),
    enterpriseTemplate(
      STYLE,
      'src/domain/aggregates/README.md.ejs',
      'src/domain/aggregates/README.md',
    ),
    enterpriseTemplate(STYLE, 'src/domain/events/README.md.ejs', 'src/domain/events/README.md'),
    enterpriseTemplate(
      STYLE,
      'src/application/commands/README.md.ejs',
      'src/application/commands/README.md',
    ),
    enterpriseTemplate(
      STYLE,
      'src/application/queries/README.md.ejs',
      'src/application/queries/README.md',
    ),
    enterpriseTemplate(
      STYLE,
      'src/application/services/README.md.ejs',
      'src/application/services/README.md',
    ),
    enterpriseTemplate(
      STYLE,
      'src/infrastructure/database/repositories/README.md.ejs',
      'src/infrastructure/database/repositories/README.md',
    ),
    enterpriseTemplate(
      STYLE,
      'src/infrastructure/database/interfaces/README.md.ejs',
      'src/infrastructure/database/interfaces/README.md',
    ),
    enterpriseTemplate(
      STYLE,
      'src/bounded-contexts/README.md.ejs',
      'src/bounded-contexts/README.md',
    ),
  ],
});
