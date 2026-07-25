import type { IdentityCache } from './identity';

const STORAGE_KEY = 'wayline_identity';

type SessionStorage = {
  get: (key: string) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
  remove: (key: string) => Promise<void>;
};

/** Persists the identity cache in chrome.storage.session — memory-only, cleared on browser exit. */
export async function writeIdentityCache(
  identity: IdentityCache,
  storage: SessionStorage,
): Promise<void> {
  await storage.set({ [STORAGE_KEY]: identity });
}

/** Reads the cached identity, or null if none has been written (or it's been cleared). */
export async function readIdentityCache(storage: SessionStorage): Promise<IdentityCache | null> {
  const result = await storage.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as IdentityCache | undefined) ?? null;
}

/** Clears the cached identity — called on sign-out, via either the ping or the cookie watcher. */
export async function clearIdentityCache(storage: SessionStorage): Promise<void> {
  await storage.remove(STORAGE_KEY);
}
