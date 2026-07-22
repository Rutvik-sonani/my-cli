import { join } from 'node:path';
import type { DomainEntityPaths } from '@mycli-cli/enterprise-core';

export interface DomainPathConfig {
  domain?: string;
  application?: string;
  infrastructure?: string;
}

/**
 * Resolve DDD folder paths for a bounded context / entity.
 */
export function resolveDomainEntityPaths(
  entityKebab: string,
  config: DomainPathConfig = {},
): DomainEntityPaths {
  const domainRoot = config.domain ?? 'src/domain';
  const appRoot = config.application ?? 'src/application';
  const infraRoot = config.infrastructure ?? 'src/infrastructure/database';
  const entityRoot = join(domainRoot, entityKebab);

  return {
    root: entityRoot,
    entities: join(entityRoot, 'entities'),
    valueObjects: join(entityRoot, 'value-objects'),
    aggregates: join(entityRoot, 'aggregates'),
    events: join(entityRoot, 'events'),
    commands: join(appRoot, 'commands'),
    queries: join(appRoot, 'queries'),
    applicationServices: join(appRoot, 'services'),
    repositoryInterfaces: join(infraRoot, 'interfaces'),
    repositories: join(infraRoot, 'repositories'),
  };
}
