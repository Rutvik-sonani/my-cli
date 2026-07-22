import { defineEnterpriseProvider, enterpriseTemplate } from './base.js';

const STYLE = 'clean-architecture' as const;

export const cleanArchitectureProvider = defineEnterpriseProvider({
  style: STYLE,
  label: 'Clean Architecture',
  description:
    'Uncle Bob style layers — dependencies point inward; domain has zero framework or database imports.',
  modulePaths: {
    modules: 'src/application',
    domain: 'src/domain',
    application: 'src/application',
    infrastructure: 'src/infrastructure',
    presentation: 'src/presentation',
  },
  dependencyRules: [
    {
      layer: 'Domain',
      path: 'src/domain',
      mayImport: [],
      mustNotImport: [
        'src/application',
        'src/infrastructure',
        'src/presentation',
        'fastify',
        'express',
        '@prisma',
        'drizzle',
      ],
      description: 'Domain entities and rules are pure TypeScript — no frameworks or ORMs.',
    },
    {
      layer: 'Application',
      path: 'src/application',
      mayImport: ['src/domain'],
      mustNotImport: ['src/infrastructure', 'src/presentation', 'fastify', 'express'],
      description: 'Use cases depend only on domain interfaces.',
    },
    {
      layer: 'Infrastructure',
      path: 'src/infrastructure',
      mayImport: ['src/domain', 'src/application'],
      mustNotImport: ['src/presentation'],
      description: 'Adapters implement ports defined by inner layers.',
    },
    {
      layer: 'Presentation',
      path: 'src/presentation',
      mayImport: ['src/application', 'src/domain'],
      mustNotImport: ['src/infrastructure'],
      description: 'HTTP controllers translate requests into application commands.',
    },
  ],
  files: [
    enterpriseTemplate(STYLE, 'ARCHITECTURE.md.ejs', 'ARCHITECTURE.md'),
    enterpriseTemplate(STYLE, 'src/domain/entities/README.md.ejs', 'src/domain/entities/README.md'),
    enterpriseTemplate(
      STYLE,
      'src/domain/interfaces/README.md.ejs',
      'src/domain/interfaces/README.md',
    ),
    enterpriseTemplate(
      STYLE,
      'src/application/use-cases/README.md.ejs',
      'src/application/use-cases/README.md',
    ),
    enterpriseTemplate(STYLE, 'src/application/dto/README.md.ejs', 'src/application/dto/README.md'),
    enterpriseTemplate(
      STYLE,
      'src/infrastructure/persistence/README.md.ejs',
      'src/infrastructure/persistence/README.md',
    ),
    enterpriseTemplate(
      STYLE,
      'src/infrastructure/http/README.md.ejs',
      'src/infrastructure/http/README.md',
    ),
    enterpriseTemplate(
      STYLE,
      'src/presentation/controllers/README.md.ejs',
      'src/presentation/controllers/README.md',
    ),
    enterpriseTemplate(
      STYLE,
      'src/presentation/routes/README.md.ejs',
      'src/presentation/routes/README.md',
    ),
    enterpriseTemplate(STYLE, 'src/composition-root.ts.ejs', 'src/composition-root.ts'),
  ],
});
