import { ConfigurationError } from '../errors/errors.js';
import type {
  Disposable,
  Lifetime,
  ServiceFactory,
  ServiceIdentifier,
  ServiceRegistration,
} from './types.js';

/**
 * Lightweight dependency injection container.
 * Supports singleton and transient lifetimes with circular dependency detection.
 */
export class Container implements Disposable {
  private readonly registrations = new Map<ServiceIdentifier, ServiceRegistration>();
  private readonly resolving = new Set<ServiceIdentifier>();
  private disposed = false;

  registerSingleton<T>(identifier: ServiceIdentifier<T>, factory: ServiceFactory<T>): this {
    return this.register(identifier, factory, 'singleton');
  }

  registerTransient<T>(identifier: ServiceIdentifier<T>, factory: ServiceFactory<T>): this {
    return this.register(identifier, factory, 'transient');
  }

  registerInstance<T>(identifier: ServiceIdentifier<T>, instance: T): this {
    this.assertNotDisposed();
    this.registrations.set(identifier, {
      identifier,
      factory: () => instance,
      lifetime: 'singleton',
      instance,
    });
    return this;
  }

  has(identifier: ServiceIdentifier): boolean {
    return this.registrations.has(identifier);
  }

  resolve<T>(identifier: ServiceIdentifier<T>): T {
    this.assertNotDisposed();

    const registration = this.registrations.get(identifier) as ServiceRegistration<T> | undefined;
    if (!registration) {
      const name = typeof identifier === 'symbol' ? identifier.toString() : String(identifier);
      throw new ConfigurationError(`Service not registered: ${name}`, {
        code: 'SERVICE_NOT_FOUND',
        details: { identifier: name },
      });
    }

    if (registration.lifetime === 'singleton' && registration.instance !== undefined) {
      return registration.instance;
    }

    if (this.resolving.has(identifier)) {
      const name = typeof identifier === 'symbol' ? identifier.toString() : String(identifier);
      throw new ConfigurationError(`Circular dependency detected while resolving: ${name}`, {
        code: 'CIRCULAR_DEPENDENCY',
        details: { identifier: name },
      });
    }

    this.resolving.add(identifier);
    try {
      const instance = registration.factory(this);
      if (registration.lifetime === 'singleton') {
        registration.instance = instance;
      }
      return instance;
    } finally {
      this.resolving.delete(identifier);
    }
  }

  tryResolve<T>(identifier: ServiceIdentifier<T>): T | undefined {
    if (!this.has(identifier)) {
      return undefined;
    }
    return this.resolve(identifier);
  }

  createChild(): Container {
    const child = new Container();
    for (const [id, registration] of this.registrations) {
      child.registrations.set(id, {
        ...registration,
        instance: registration.lifetime === 'singleton' ? registration.instance : undefined,
      });
    }
    return child;
  }

  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }
    this.disposed = true;

    const disposables: Disposable[] = [];
    for (const registration of this.registrations.values()) {
      if (registration.instance && isDisposable(registration.instance)) {
        disposables.push(registration.instance);
      }
    }

    await Promise.all(disposables.map((d) => Promise.resolve(d.dispose())));
    this.registrations.clear();
  }

  private register<T>(
    identifier: ServiceIdentifier<T>,
    factory: ServiceFactory<T>,
    lifetime: Lifetime,
  ): this {
    this.assertNotDisposed();
    this.registrations.set(identifier, { identifier, factory, lifetime });
    return this;
  }

  private assertNotDisposed(): void {
    if (this.disposed) {
      throw new ConfigurationError('Container has been disposed', { code: 'CONTAINER_DISPOSED' });
    }
  }
}

function isDisposable(value: unknown): value is Disposable {
  return (
    typeof value === 'object' &&
    value !== null &&
    'dispose' in value &&
    typeof (value as Disposable).dispose === 'function'
  );
}
