import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';
import { createTestDb } from './db/test-client';
import { createAuth } from './lib/auth';
import { createApp } from './app';
import { workspaces } from './db/schema';

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

  function listMyWorkspaces(cookie: string | null) {
    return app.request('/v1/me/workspaces', {
      headers: cookie ? { cookie } : {},
    });
  }

  return { app, db, close, signIn, createWorkspace, listMyWorkspaces };
}

describe('my-workspaces over HTTP (WAYLI-30 acceptance)', () => {
  it('lists every workspace the caller belongs to as admin, in creation order', async () => {
    const h = await buildHarness();

    try {
      const cookie = await h.signIn('owner@example.com', '10.2.0.1');

      const first = await h.createWorkspace(cookie, { name: 'Alpha', slug: 'alpha' });
      const second = await h.createWorkspace(cookie, { name: 'Beta', slug: 'beta' });
      expect(first.status).toBe(201);
      expect(second.status).toBe(201);

      const res = await h.listMyWorkspaces(cookie);
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        workspaces: { role: string; workspace: { slug: string } }[];
      };
      expect(body.workspaces).toEqual([
        expect.objectContaining({
          role: 'admin',
          workspace: expect.objectContaining({ slug: 'alpha' }),
        }),
        expect.objectContaining({
          role: 'admin',
          workspace: expect.objectContaining({ slug: 'beta' }),
        }),
      ]);
    } finally {
      await h.close();
    }
  });

  it('excludes a workspace the caller does not belong to and one that is soft-deleted', async () => {
    const h = await buildHarness();

    try {
      const cookieA = await h.signIn('owner-a@example.com', '10.2.0.2');
      const cookieB = await h.signIn('owner-b@example.com', '10.2.0.3');

      const created = await h.createWorkspace(cookieA, { name: 'Alpha', slug: 'alpha' });
      const ws = (await created.json()) as { id: string };
      const otherCreated = await h.createWorkspace(cookieA, { name: 'Gamma', slug: 'gamma' });
      const otherWs = (await otherCreated.json()) as { id: string };
      await h.db
        .update(workspaces)
        .set({ deletedAt: new Date() })
        .where(eq(workspaces.id, otherWs.id));

      const resB = await h.listMyWorkspaces(cookieB);
      const bodyB = (await resB.json()) as { workspaces: unknown[] };
      expect(bodyB.workspaces).toEqual([]);

      const resA = await h.listMyWorkspaces(cookieA);
      const bodyA = (await resA.json()) as { workspaces: { workspace: { id: string } }[] };
      expect(bodyA.workspaces).toEqual([
        expect.objectContaining({
          workspace: { id: ws.id, name: 'Alpha', slug: 'alpha', plan: 'free' },
        }),
      ]);
    } finally {
      await h.close();
    }
  });

  it('rejects an unauthenticated request with 401', async () => {
    const h = await buildHarness();

    try {
      const res = await h.listMyWorkspaces(null);
      expect(res.status).toBe(401);
    } finally {
      await h.close();
    }
  });
});
