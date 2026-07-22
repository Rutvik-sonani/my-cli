import { defineEnterpriseProvider, enterpriseTemplate } from './base.js';

const STYLE = 'mvc' as const;

export const mvcProvider = defineEnterpriseProvider({
  style: STYLE,
  label: 'MVC',
  description:
    'Model-View-Controller separation — controllers handle HTTP, models hold data, services contain business logic.',
  modulePaths: {
    modules: 'src/modules',
    controllers: 'src/controllers',
    services: 'src/services',
    presentation: 'src/views',
  },
  dependencyRules: [
    {
      layer: 'Controllers',
      path: 'src/controllers',
      mayImport: ['src/models', 'src/services', 'src/middleware', 'src/dto'],
      mustNotImport: ['src/infrastructure', 'src/database'],
      description: 'Controllers orchestrate requests; they must not access persistence directly.',
    },
    {
      layer: 'Services',
      path: 'src/services',
      mayImport: ['src/models', 'src/repositories', 'src/dto'],
      mustNotImport: ['src/controllers', 'src/views'],
      description: 'Services implement use cases and depend on abstractions, not HTTP layers.',
    },
    {
      layer: 'Models',
      path: 'src/models',
      mayImport: [],
      mustNotImport: ['src/controllers', 'src/services', 'src/infrastructure'],
      description: 'Models are plain data structures with no framework or HTTP dependencies.',
    },
  ],
  files: [
    enterpriseTemplate(STYLE, 'ARCHITECTURE.md.ejs', 'ARCHITECTURE.md'),
    enterpriseTemplate(STYLE, 'src/controllers/README.md.ejs', 'src/controllers/README.md'),
    enterpriseTemplate(STYLE, 'src/models/README.md.ejs', 'src/models/README.md'),
    enterpriseTemplate(STYLE, 'src/services/README.md.ejs', 'src/services/README.md'),
    enterpriseTemplate(STYLE, 'src/middleware/README.md.ejs', 'src/middleware/README.md'),
    enterpriseTemplate(STYLE, 'src/dto/README.md.ejs', 'src/dto/README.md'),
    enterpriseTemplate(STYLE, 'src/routes/index.ts.ejs', 'src/routes/index.ts'),
  ],
});
