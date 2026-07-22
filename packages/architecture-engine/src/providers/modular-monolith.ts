import { defineEnterpriseProvider, enterpriseTemplate } from './base.js';

const STYLE = 'modular-monolith' as const;

export const modularMonolithProvider = defineEnterpriseProvider({
  style: STYLE,
  label: 'Modular Monolith',
  description:
    'Single deployable application with strict module boundaries — each feature is a self-contained module.',
  modulePaths: {
    modules: 'src/modules',
    domain: 'src/modules',
    application: 'src/modules',
    infrastructure: 'src/shared/infrastructure',
    services: 'src/shared',
  },
  dependencyRules: [
    {
      layer: 'Feature modules',
      path: 'src/modules/*',
      mayImport: ['src/shared', 'src/modules/*/contracts'],
      mustNotImport: ['src/modules/*/!(self)'],
      description:
        'Modules communicate via explicit contracts or shared kernel — no direct cross-module imports.',
    },
    {
      layer: 'Shared kernel',
      path: 'src/shared',
      mayImport: [],
      mustNotImport: ['src/modules'],
      description: 'Shared code has no knowledge of feature modules.',
    },
    {
      layer: 'Infrastructure',
      path: 'src/shared/infrastructure',
      mayImport: ['src/shared'],
      mustNotImport: ['src/modules'],
      description: 'Infrastructure adapters are wired at the application boundary.',
    },
  ],
  files: [
    enterpriseTemplate(STYLE, 'ARCHITECTURE.md.ejs', 'ARCHITECTURE.md'),
    enterpriseTemplate(STYLE, 'src/modules/README.md.ejs', 'src/modules/README.md'),
    enterpriseTemplate(STYLE, 'src/shared/kernel/README.md.ejs', 'src/shared/kernel/README.md'),
    enterpriseTemplate(
      STYLE,
      'src/shared/infrastructure/README.md.ejs',
      'src/shared/infrastructure/README.md',
    ),
    enterpriseTemplate(
      STYLE,
      'src/shared/contracts/README.md.ejs',
      'src/shared/contracts/README.md',
    ),
    enterpriseTemplate(
      STYLE,
      'src/bootstrap/register-modules.ts.ejs',
      'src/bootstrap/register-modules.ts',
    ),
  ],
});
