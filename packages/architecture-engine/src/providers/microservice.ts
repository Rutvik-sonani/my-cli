import { defineEnterpriseProvider, enterpriseTemplate } from './base.js';

const STYLE = 'microservice' as const;

export const microserviceProvider = defineEnterpriseProvider({
  style: STYLE,
  label: 'Microservice Architecture',
  description:
    'Service-oriented layout — each service is independently deployable with shared contracts.',
  modulePaths: {
    modules: 'services',
    services: 'services',
    infrastructure: 'shared/infrastructure',
  },
  dependencyRules: [
    {
      layer: 'Services',
      path: 'services/*',
      mayImport: ['shared/contracts', 'shared/kernel'],
      mustNotImport: ['services/*/!(self)'],
      description: 'Services do not import each other directly — use contracts or async messaging.',
    },
    {
      layer: 'Shared contracts',
      path: 'shared/contracts',
      mayImport: [],
      mustNotImport: ['services'],
      description: 'DTOs and event schemas shared between services — no business logic.',
    },
    {
      layer: 'API Gateway',
      path: 'services/api-gateway',
      mayImport: ['shared/contracts'],
      mustNotImport: ['services/*/internal'],
      description: 'Gateway routes external traffic; it does not contain domain logic.',
    },
  ],
  files: [
    enterpriseTemplate(STYLE, 'ARCHITECTURE.md.ejs', 'ARCHITECTURE.md'),
    enterpriseTemplate(STYLE, 'services/README.md.ejs', 'services/README.md'),
    enterpriseTemplate(
      STYLE,
      'services/api-gateway/README.md.ejs',
      'services/api-gateway/README.md',
    ),
    enterpriseTemplate(STYLE, 'shared/contracts/README.md.ejs', 'shared/contracts/README.md'),
    enterpriseTemplate(STYLE, 'shared/kernel/README.md.ejs', 'shared/kernel/README.md'),
    enterpriseTemplate(
      STYLE,
      'shared/infrastructure/README.md.ejs',
      'shared/infrastructure/README.md',
    ),
    enterpriseTemplate(STYLE, 'docker-compose.services.yml.ejs', 'docker-compose.services.yml'),
  ],
});
