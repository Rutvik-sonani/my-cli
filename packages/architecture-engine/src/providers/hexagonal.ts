import { defineEnterpriseProvider, enterpriseTemplate } from './base.js';

const STYLE = 'hexagonal' as const;

export const hexagonalProvider = defineEnterpriseProvider({
  style: STYLE,
  label: 'Hexagonal Architecture',
  description:
    'Ports and adapters — the core is isolated; inbound/outbound adapters plug into ports.',
  modulePaths: {
    modules: 'src/core',
    domain: 'src/core/domain',
    application: 'src/core/application',
    infrastructure: 'src/adapters/outbound',
    presentation: 'src/adapters/inbound',
  },
  dependencyRules: [
    {
      layer: 'Core domain',
      path: 'src/core/domain',
      mayImport: [],
      mustNotImport: ['src/adapters', 'src/core/ports', 'fastify', 'express'],
      description: 'Domain model has no adapter or port knowledge.',
    },
    {
      layer: 'Core application',
      path: 'src/core/application',
      mayImport: ['src/core/domain', 'src/core/ports'],
      mustNotImport: ['src/adapters'],
      description: 'Application services depend on port interfaces, not concrete adapters.',
    },
    {
      layer: 'Inbound adapters',
      path: 'src/adapters/inbound',
      mayImport: ['src/core/application', 'src/core/ports/inbound'],
      mustNotImport: ['src/adapters/outbound'],
      description: 'HTTP/CLI adapters translate external input into application calls.',
    },
    {
      layer: 'Outbound adapters',
      path: 'src/adapters/outbound',
      mayImport: ['src/core/ports/outbound', 'src/core/domain'],
      mustNotImport: ['src/adapters/inbound', 'src/core/application'],
      description: 'Persistence and external API clients implement outbound ports.',
    },
  ],
  files: [
    enterpriseTemplate(STYLE, 'ARCHITECTURE.md.ejs', 'ARCHITECTURE.md'),
    enterpriseTemplate(STYLE, 'src/core/domain/README.md.ejs', 'src/core/domain/README.md'),
    enterpriseTemplate(
      STYLE,
      'src/core/application/README.md.ejs',
      'src/core/application/README.md',
    ),
    enterpriseTemplate(
      STYLE,
      'src/core/ports/inbound/README.md.ejs',
      'src/core/ports/inbound/README.md',
    ),
    enterpriseTemplate(
      STYLE,
      'src/core/ports/outbound/README.md.ejs',
      'src/core/ports/outbound/README.md',
    ),
    enterpriseTemplate(
      STYLE,
      'src/adapters/inbound/http/README.md.ejs',
      'src/adapters/inbound/http/README.md',
    ),
    enterpriseTemplate(
      STYLE,
      'src/adapters/outbound/persistence/README.md.ejs',
      'src/adapters/outbound/persistence/README.md',
    ),
    enterpriseTemplate(STYLE, 'src/wiring/container.ts.ejs', 'src/wiring/container.ts'),
  ],
});
