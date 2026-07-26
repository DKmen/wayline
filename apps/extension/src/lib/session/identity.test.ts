import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchIdentity } from './identity';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchIdentity', () => {
  it('combines get-session and me/workspaces into an identity cache', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          session: { expiresAt: '2026-08-01T00:00:00.000Z' },
          user: { id: 'user_1', email: 'ada@example.com', name: 'Ada' },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          workspaces: [
            {
              workspace: {
                id: '123e4567-e89b-12d3-a456-426614174000',
                name: 'Acme',
                slug: 'acme',
                plan: 'free',
              },
              role: 'admin',
            },
          ],
        }),
      );

    const identity = await fetchIdentity(fetchImpl);

    expect(identity).toEqual({
      user: { id: 'user_1', email: 'ada@example.com', name: 'Ada' },
      workspaces: [
        {
          workspace: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Acme',
            slug: 'acme',
            plan: 'free',
          },
          role: 'admin',
        },
      ],
      cachedAt: expect.any(String),
    });
    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/api/auth/get-session'),
      expect.objectContaining({ headers: { 'x-wayline-client': 'extension' } }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/v1/me/workspaces'),
      expect.objectContaining({ headers: { 'x-wayline-client': 'extension' } }),
    );
  });

  it('returns null when there is no session', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(jsonResponse(null));

    await expect(fetchIdentity(fetchImpl)).resolves.toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(1); // never calls me/workspaces without a session
  });

  it('returns null when me/workspaces rejects a revoked session with 401', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          session: { expiresAt: '2026-08-01T00:00:00.000Z' },
          user: { id: 'user_1', email: 'ada@example.com', name: 'Ada' },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ error: { code: 'unauthorized' } }, 401));

    await expect(fetchIdentity(fetchImpl)).resolves.toBeNull();
  });

  it('returns null when the fetch itself rejects (network failure)', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(fetchIdentity(fetchImpl)).resolves.toBeNull();
  });

  it('returns null when the session response body does not match the expected schema', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(jsonResponse({ not: 'a valid session shape' }));

    await expect(fetchIdentity(fetchImpl)).resolves.toBeNull();
  });
});
