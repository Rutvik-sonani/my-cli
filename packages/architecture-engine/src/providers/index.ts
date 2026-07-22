import type {
  ArchitectureStyle,
  ArchitectureStyleProvider,
  LegacyArchitectureStyle,
} from '../types.js';
import { cleanArchitectureProvider } from './clean-architecture.js';
import { dddProvider } from './ddd.js';
import { hexagonalProvider } from './hexagonal.js';
import { microserviceProvider } from './microservice.js';
import { modularMonolithProvider } from './modular-monolith.js';
import { mvcProvider } from './mvc.js';

const ENTERPRISE_PROVIDERS: ArchitectureStyleProvider[] = [
  mvcProvider,
  modularMonolithProvider,
  cleanArchitectureProvider,
  hexagonalProvider,
  dddProvider,
  microserviceProvider,
];

const PROVIDER_MAP = new Map<ArchitectureStyle, ArchitectureStyleProvider>(
  ENTERPRISE_PROVIDERS.map((provider) => [provider.style, provider]),
);

const LEGACY_STYLES = new Set<LegacyArchitectureStyle>(['monolith', 'monorepo', 'polyrepo']);

export function isLegacyArchitectureStyle(
  style: ArchitectureStyle,
): style is LegacyArchitectureStyle {
  return LEGACY_STYLES.has(style as LegacyArchitectureStyle);
}

export function getArchitectureProvider(
  style: ArchitectureStyle,
): ArchitectureStyleProvider | undefined {
  return PROVIDER_MAP.get(style);
}

export function listEnterpriseArchitectureStyles(): ArchitectureStyleProvider[] {
  return [...ENTERPRISE_PROVIDERS];
}

export function listAllArchitectureStyles(): Array<{
  style: ArchitectureStyle;
  label: string;
  description: string;
  enterprise: boolean;
}> {
  const enterprise = ENTERPRISE_PROVIDERS.map((provider) => ({
    style: provider.style,
    label: provider.label,
    description: provider.description,
    enterprise: true,
  }));

  const legacy: Array<{
    style: ArchitectureStyle;
    label: string;
    description: string;
    enterprise: boolean;
  }> = [
    {
      style: 'monolith',
      label: 'Monolith (legacy)',
      description: 'Simple single-app layout — use MVC or Modular Monolith for new projects.',
      enterprise: false,
    },
    {
      style: 'monorepo',
      label: 'Monorepo (layout)',
      description: 'pnpm workspace with apps/ and packages/ — combine with any architecture style.',
      enterprise: false,
    },
    {
      style: 'polyrepo',
      label: 'Polyrepo (layout)',
      description: 'Multi-repository coordination documentation.',
      enterprise: false,
    },
  ];

  return [...enterprise, ...legacy];
}

export {
  mvcProvider,
  modularMonolithProvider,
  cleanArchitectureProvider,
  hexagonalProvider,
  dddProvider,
  microserviceProvider,
};
