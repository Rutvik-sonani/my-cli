import type { EventHandler, EventMap, Unsubscribe } from './types.js';

/**
 * Typed asynchronous event bus with ordered handler execution.
 */
export class EventBus<TEvents extends EventMap = EventMap> {
  private readonly handlers = new Map<keyof TEvents & string, Set<EventHandler>>();

  on<K extends keyof TEvents & string>(event: K, handler: EventHandler<TEvents[K]>): Unsubscribe {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as EventHandler);
    return () => {
      set?.delete(handler as EventHandler);
    };
  }

  once<K extends keyof TEvents & string>(event: K, handler: EventHandler<TEvents[K]>): Unsubscribe {
    const unsubscribe = this.on(event, async (payload) => {
      unsubscribe();
      await handler(payload);
    });
    return unsubscribe;
  }

  off<K extends keyof TEvents & string>(event: K, handler: EventHandler<TEvents[K]>): void {
    this.handlers.get(event)?.delete(handler as EventHandler);
  }

  async emit<K extends keyof TEvents & string>(event: K, payload: TEvents[K]): Promise<void> {
    const set = this.handlers.get(event);
    if (!set || set.size === 0) {
      return;
    }

    for (const handler of [...set]) {
      await handler(payload);
    }
  }

  clear(event?: keyof TEvents & string): void {
    if (event) {
      this.handlers.delete(event);
      return;
    }
    this.handlers.clear();
  }

  listenerCount(event: keyof TEvents & string): number {
    return this.handlers.get(event)?.size ?? 0;
  }
}
