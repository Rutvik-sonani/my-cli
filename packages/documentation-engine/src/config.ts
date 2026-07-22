import { join } from 'node:path';
import type { DocumentationDocument, DocumentationKind } from '@mycli/enterprise-core';

export interface DocumentationPathConfig {
  documentation?: string;
}

export interface DocumentationPaths {
  root: string;
  generators: string;
  templates: string;
}

export function resolveDocumentationPaths(
  config: DocumentationPathConfig = {},
): DocumentationPaths {
  const root = config.documentation ?? 'src/documentation';
  return {
    root,
    generators: join(root, 'generators'),
    templates: join(root, 'templates'),
  };
}

export function getDocumentationEnvLines(appName: string): string[] {
  return [
    `DOCUMENTATION_APP=${appName}`,
    'DOCUMENTATION_ENABLED=true',
    'DOCUMENTATION_FORCE=false',
  ];
}

export const DOCUMENTATION_CATALOG: DocumentationDocument[] = [
  {
    kind: 'architecture',
    filename: 'ARCHITECTURE.md',
    title: 'Architecture',
    description: 'System structure, layers, and module boundaries',
  },
  {
    kind: 'security',
    filename: 'SECURITY.md',
    title: 'Security',
    description: 'Auth, hardening, secrets, and vulnerability response',
  },
  {
    kind: 'compliance',
    filename: 'COMPLIANCE.md',
    title: 'Compliance',
    description: 'Regulatory controls, retention, and audit expectations',
  },
  {
    kind: 'operations',
    filename: 'OPERATIONS.md',
    title: 'Operations',
    description: 'Runbooks, monitoring, on-call, and incident response',
  },
  {
    kind: 'scaling',
    filename: 'SCALING.md',
    title: 'Scaling',
    description: 'Capacity planning, horizontal scaling, and bottlenecks',
  },
  {
    kind: 'disaster-recovery',
    filename: 'DISASTER_RECOVERY.md',
    title: 'Disaster Recovery',
    description: 'Backup, RPO/RTO, failover, and recovery drills',
  },
  {
    kind: 'api-guide',
    filename: 'API_GUIDE.md',
    title: 'API Guide',
    description: 'API conventions, versioning, auth, and examples',
  },
];

export function listDocumentationDocuments(only?: DocumentationKind[]): DocumentationDocument[] {
  if (!only?.length) return [...DOCUMENTATION_CATALOG];
  const wanted = new Set(only);
  return DOCUMENTATION_CATALOG.filter((doc) => wanted.has(doc.kind));
}

export function parseDocumentationKinds(raw?: string | string[]): DocumentationKind[] | undefined {
  if (!raw) return undefined;
  const parts = (Array.isArray(raw) ? raw : raw.split(',')).map((s) => s.trim().toLowerCase());
  const valid = new Set(DOCUMENTATION_CATALOG.map((d) => d.kind));
  const kinds = parts.filter((p): p is DocumentationKind => valid.has(p as DocumentationKind));
  return kinds.length > 0 ? kinds : undefined;
}

export function templatePathForKind(kind: DocumentationKind): string {
  return `features/documentation/docs/${kind}.md.ejs`;
}
