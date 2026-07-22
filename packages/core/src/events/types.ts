export type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;

export type Unsubscribe = () => void;

export interface EventMap {
  [event: string]: unknown;
}
