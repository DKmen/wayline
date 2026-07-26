import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchIdentity = vi.fn();
const writeIdentityCache = vi.fn();
const clearIdentityCache = vi.fn();

vi.mock('wxt/browser', () => ({
  browser: {
    storage: { session: {} },
  },
}));

vi.mock('../../lib/session/identity', () => ({ fetchIdentity }));
vi.mock('../../lib/session/identity-store', () => ({ writeIdentityCache, clearIdentityCache }));

afterEach(() => {
  vi.clearAllMocks();
});

describe('session orchestration', () => {
  // Fresh module per test — the generation counter is module-level state used to guard
  // against an in-flight identity fetch resurrecting stale data after a sign-out lands
  // first, so each test needs its own untouched counter.
  beforeEach(() => {
    vi.resetModules();
  });

  it('writes the fetched identity to the cache on session-ready', async () => {
    const identity = {
      user: { id: 'u1', email: 'a@example.com', name: null },
      workspaces: [],
      cachedAt: 'x',
    };
    fetchIdentity.mockResolvedValue(identity);
    const { handleSessionReady } = await import('./session');

    await handleSessionReady();

    expect(writeIdentityCache).toHaveBeenCalledWith(identity, expect.anything());
    expect(clearIdentityCache).not.toHaveBeenCalled();
  });

  it('clears the cache on session-ready when fetchIdentity resolves null (no/revoked session)', async () => {
    fetchIdentity.mockResolvedValue(null);
    const { handleSessionReady } = await import('./session');

    await handleSessionReady();

    expect(clearIdentityCache).toHaveBeenCalledOnce();
    expect(writeIdentityCache).not.toHaveBeenCalled();
  });

  it('clears the cache on session-ended', async () => {
    const { handleSessionEnded } = await import('./session');

    await handleSessionEnded();

    expect(clearIdentityCache).toHaveBeenCalledOnce();
  });

  it('does not resurrect identity if session-ended lands while a session-ready fetch is in flight', async () => {
    let resolveFetch!: (value: unknown) => void;
    fetchIdentity.mockReturnValue(new Promise((resolve) => (resolveFetch = resolve)));
    const { handleSessionReady, handleSessionEnded } = await import('./session');

    const readyPromise = handleSessionReady();
    await handleSessionEnded(); // lands first, bumping the generation counter
    resolveFetch({
      user: { id: 'u1', email: 'a@example.com', name: null },
      workspaces: [],
      cachedAt: 'x',
    });
    await readyPromise;

    // handleSessionEnded's clear, then handleSessionReady's fetch resolves too late —
    // its write must be skipped, not layered on top of the clear.
    expect(clearIdentityCache).toHaveBeenCalledOnce();
    expect(writeIdentityCache).not.toHaveBeenCalled();
  });
});
