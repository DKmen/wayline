import { describe, expect, it, vi } from 'vitest';
import { clearIdentityCache, readIdentityCache, writeIdentityCache } from './identity-store';
import type { IdentityCache } from './identity';

function fakeStorage() {
  const data = new Map<string, unknown>();
  return {
    get: vi.fn(async (key: string) => ({ [key]: data.get(key) })),
    set: vi.fn(async (items: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(items)) data.set(key, value);
    }),
    remove: vi.fn(async (key: string) => {
      data.delete(key);
    }),
  };
}

const identity: IdentityCache = {
  user: { id: 'user_1', email: 'ada@example.com', name: 'Ada' },
  workspaces: [],
  cachedAt: '2026-07-25T00:00:00.000Z',
};

describe('identity-store', () => {
  it('writes and reads back the identity cache', async () => {
    const storage = fakeStorage();

    await writeIdentityCache(identity, storage);

    await expect(readIdentityCache(storage)).resolves.toEqual(identity);
  });

  it('returns null when nothing has been cached yet', async () => {
    const storage = fakeStorage();

    await expect(readIdentityCache(storage)).resolves.toBeNull();
  });

  it('clears the cache so a subsequent read returns null', async () => {
    const storage = fakeStorage();
    await writeIdentityCache(identity, storage);

    await clearIdentityCache(storage);

    await expect(readIdentityCache(storage)).resolves.toBeNull();
  });
});
