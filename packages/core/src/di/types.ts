export type ServiceIdentifier<T = unknown> = string | symbol | (new (...args: never[]) => T);

export type ServiceFactory<T> = (container: import('./container.js').Container) => T;

export interface Disposable {
  dispose(): void | Promise<void>;
}

export type Lifetime = 'singleton' | 'transient';

export interface ServiceRegistration<T = unknown> {
  identifier: ServiceIdentifier<T>;
  factory: ServiceFactory<T>;
  lifetime: Lifetime;
  instance?: T;
}
