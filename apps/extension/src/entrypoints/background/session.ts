import { browser } from 'wxt/browser';
import { fetchIdentity } from '../../lib/session/identity';
import { clearIdentityCache, writeIdentityCache } from '../../lib/session/identity-store';

// Guards against a session-ready fetch that's still in flight resurrecting identity
// after a session-ended (or cookie-removal) event has already cleared it — bumped by
// handleSessionEnded, checked by handleSessionReady before it writes.
let generation = 0;

/** Fetches identity for a just-signed-in session and caches it, or clears the cache if none exists. */
export async function handleSessionReady(): Promise<void> {
  const startedAtGeneration = generation;
  const identity = await fetchIdentity();
  if (generation !== startedAtGeneration) return;

  if (identity) await writeIdentityCache(identity, browser.storage.session);
  else await clearIdentityCache(browser.storage.session);
}

/** Clears the cached identity on sign-out. */
export async function handleSessionEnded(): Promise<void> {
  generation += 1;
  await clearIdentityCache(browser.storage.session);
}
