/**
 * Domain-driven design artifact paths (Phase 2).
 */
export interface DomainEntityPaths {
  root: string;
  entities: string;
  valueObjects: string;
  aggregates: string;
  events: string;
  commands: string;
  queries: string;
  applicationServices: string;
  repositoryInterfaces: string;
  repositories: string;
}

export interface DomainLayerPaths {
  domain: string;
  application: string;
  infrastructure: string;
}
