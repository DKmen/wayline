import { describe, expect, it, vi } from 'vitest';
import { createTestDb } from './db/test-client';
import { createAuth } from './lib/auth';
import { createApp } from './app';

async function buildHarness() {
  const { db, close } = await createTestDb();
  const sentMail: { to: string; html: string }[] = [];
  const mailer = {
    send: vi.fn(async (message: { to: string; subject: string; html: string }) => {
      sentMail.push({ to: message.to, html: message.html });
    }),
  };
  const auth = createAuth({ db, mailer, secret: 'a'.repeat(32), baseURL: 'http://localhost:3000' });
  // '' means the extension-origin guard does not apply; these tests exercise dashboard flows only.
  const app = createApp(auth, db, '');

  async function signIn(email: string, ip: string): Promise<string> {
    await app.request('/api/auth/sign-in/magic-link', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify({ email }),
    });
    const mail = sentMail[sentMail.length - 1];
    const match = mail!.html.match(/href="([^"]+)"/);
    const verifyPath = match![1]!.replace('http://localhost:3000', '');
    const verifyRes = await app.request(verifyPath, {
      redirect: 'manual',
      headers: { 'x-forwarded-for': ip },
    });
    const setCookie = verifyRes.headers.get('set-cookie');
    if (!setCookie) throw new Error(`sign-in for ${email} produced no session cookie`);
    return setCookie.split(';')[0]!;
  }

  function createWorkspace(cookie: string | null, body: unknown) {
    return app.request('/v1/workspaces', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body),
    });
  }

  function listFlows(cookie: string | null, workspaceId: string) {
    return app.request(`/v1/workspaces/${workspaceId}/flows`, {
      headers: cookie ? { cookie } : {},
    });
  }

  return { app, db, close, signIn, createWorkspace, listFlows };
}

describe('flows over HTTP (WAYLI-30 acceptance)', () => {
  it('returns an empty library for a member of a fresh workspace', async () => {
    const h = await buildHarness();

    try {
      const cookie = await h.signIn('owner@example.com', '10.3.0.1');
      const created = await h.createWorkspace(cookie, { name: 'Alpha', slug: 'alpha' });
      const ws = (await created.json()) as { id: string };

      const res = await h.listFlows(cookie, ws.id);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ flows: [] });
    } finally {
      await h.close();
    }
  });

  it('403s a non-member and 400s a malformed workspace id', async () => {
    const h = await buildHarness();

    try {
      const cookieA = await h.signIn('owner-a@example.com', '10.3.0.2');
      const cookieB = await h.signIn('owner-b@example.com', '10.3.0.3');
      const created = await h.createWorkspace(cookieA, { name: 'Alpha', slug: 'alpha' });
      const ws = (await created.json()) as { id: string };

      const crossRes = await h.listFlows(cookieB, ws.id);
      expect(crossRes.status).toBe(403);

      const malformedRes = await h.listFlows(cookieA, 'not-a-uuid');
      expect(malformedRes.status).toBe(400);
    } finally {
      await h.close();
    }
  });
});
