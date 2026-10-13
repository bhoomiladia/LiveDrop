import "server-only";

// In-process pub/sub for live shows. One Node process serves the whole demo,
// so a Map of listeners is enough. Stored on globalThis to survive dev reloads.

export type ShowEvent = { type: string; [key: string]: unknown };
type Listener = (event: ShowEvent) => void;

const hub = (globalThis as unknown as { __liveDropHub?: Map<string, Set<Listener>> });
hub.__liveDropHub ??= new Map();
const channels = hub.__liveDropHub;

export function subscribe(showId: string, listener: Listener): () => void {
  let set = channels.get(showId);
  if (!set) channels.set(showId, (set = new Set()));
  set.add(listener);
  return () => {
    set!.delete(listener);
    if (set!.size === 0) channels.delete(showId);
  };
}

export function publish(showId: string, event: ShowEvent): void {
  for (const listener of channels.get(showId) ?? []) {
    try {
      listener(event);
    } catch {
      // A broken connection must not stop the others.
    }
  }
}

export function viewerCount(showId: string): number {
  return channels.get(showId)?.size ?? 0;
}
