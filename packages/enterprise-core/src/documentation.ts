/**
 * Enterprise documentation generation contracts (Phase 19).
 */
export type DocumentationKind =
  | 'architecture'
  | 'security'
  | 'compliance'
  | 'operations'
  | 'scaling'
  | 'disaster-recovery'
  | 'api-guide';

export interface DocumentationDocument {
  kind: DocumentationKind;
  filename: string;
  title: string;
  description: string;
}

export type DocumentationGenerateStatus = 'created' | 'skipped' | 'planned' | 'overwritten';

export interface DocumentationGenerateResultItem {
  kind: DocumentationKind;
  filename: string;
  status: DocumentationGenerateStatus;
  reason?: string;
}

export interface DocumentationGenerateReport {
  id: string;
  generatedAt: Date;
  projectName: string;
  dryRun: boolean;
  force: boolean;
  results: DocumentationGenerateResultItem[];
  created: number;
  skipped: number;
  overwritten: number;
}

export interface DocumentationGenerateOptions {
  cwd?: string;
  projectName?: string;
  dryRun?: boolean;
  force?: boolean;
  only?: DocumentationKind[];
}
