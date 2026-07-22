import { join } from 'node:path';

export interface CqrsPathConfig {
  cqrs?: string;
  application?: string;
}

export interface CqrsPaths {
  root: string;
  middleware: string;
  commands: string;
  commandHandlers: string;
  queries: string;
  queryHandlers: string;
  events: string;
}

export function resolveCqrsPaths(config: CqrsPathConfig = {}): CqrsPaths {
  const appRoot = config.application ?? 'src/application';
  const cqrsRoot = config.cqrs ?? 'src/cqrs';

  return {
    root: cqrsRoot,
    middleware: join(cqrsRoot, 'middleware'),
    commands: join(appRoot, 'commands'),
    commandHandlers: join(appRoot, 'commands', 'handlers'),
    queries: join(appRoot, 'queries'),
    queryHandlers: join(appRoot, 'queries', 'handlers'),
    events: join(appRoot, 'events'),
  };
}
