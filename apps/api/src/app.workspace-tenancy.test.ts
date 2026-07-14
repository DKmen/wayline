import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';
import { createTestDb } from './db/test-client';
import { createAuth } from './lib/auth';
import { createApp } from './app';
import { auditLog, session, users, workspaces } from './db/schema';

async function buildHarness() {
  const { db, close } = await createTestDb();
  const sentMail: { to: string; html: string }[] = [];
  const mailer = {
    send: vi.fn(async (message: { to: string; subject: string; html: string }) => {
      sentMail.push({ to: message.to, html: message.html });
    }),
  };
  const auth = createAuth({ db, mailer, secret: 'a'.repeat(32), baseURL: 'http://localhost:3000' });
  const app = createApp(auth, db);

  /**
   * Real magic-link sign-in to obtain a genuine session cookie — each caller uses a
   * distinct fake IP so Better Auth's module-level per-IP rate limiter (see
   * app.auth-flow.test.ts) never couples one test's sign-ins to another's.
   */
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
    // The cookie attribute list (Path, HttpOnly, ...) is response metadata — requests
    // send only the name=value pair.
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

  function listMembers(cookie: string | null, workspaceId: string) {
    return app.request(`/v1/workspaces/${workspaceId}/members`, {
      headers: cookie ? { cookie } : {},
    });
  }

  return { app, db, close, signIn, createWorkspace, listMembers };
}

describe('workspace tenancy over HTTP (WAYLI-28 acceptance)', () => {
  it('isolates two workspaces: members read their own, cross-workspace reads 403 both ways', async () => {
    const h = await buildHarness();

    try {
      const cookieA = await h.signIn('owner-a@example.com', '10.1.0.1');
      const cookieB = await h.signIn('owner-b@example.com', '10.1.0.2');

      const resA = await h.createWorkspace(cookieA, { name: 'Alpha', slug: 'alpha' });
      const resB = await h.createWorkspace(cookieB, { name: 'Beta', slug: 'beta' });
      expect(resA.status).toBe(201);
      expect(resB.status).toBe(201);
      const wsA = (await resA.json()) as { id: string };
      const wsB = (await resB.json()) as { id: string };

      // Creation wrote the audit trail (workspace.created + member.added per workspace).
      const auditRows = await h.db.select().from(auditLog);
      expect(auditRows).toHaveLength(4);

      // Positive: each owner lists their own members. Magic-link users have no name, so
      // give owner A one — proving both the null-name fallback (owner B) and the real-name
      // path serialize correctly.
      await h.db
        .update(users)
        .set({ name: 'Owner A' })
        .where(eq(users.email, 'owner-a@example.com'));
      const ownRes = await h.listMembers(cookieA, wsA.id);
      expect(ownRes.status).toBe(200);
      const ownBody = (await ownRes.json()) as {
        members: { email: string; role: string; name: string }[];
      };
      expect(ownBody.members).toEqual([
        expect.objectContaining({ email: 'owner-a@example.com', role: 'admin', name: 'Owner A' }),
      ]);

      const ownResB = await h.listMembers(cookieB, wsB.id);
      const ownBodyB = (await ownResB.json()) as { members: { name: string }[] };
      expect(ownBodyB.members).toEqual([expect.objectContaining({ name: '' })]);

      // The ticket's headline: cross-workspace reads are 403 in both directions.
      const crossAtoB = await h.listMembers(cookieA, wsB.id);
      const crossBtoA = await h.listMembers(cookieB, wsA.id);
      expect(crossAtoB.status).toBe(403);
      expect(crossBtoA.status).toBe(403);
    } finally {
      await h.close();
    }
  });

  it('rejects unauthenticated and expired-session requests with 401', async () => {
    const h = await buildHarness();

    try {
      const cookie = await h.signIn('owner@example.com', '10.1.0.3');
      const created = await h.createWorkspace(cookie, { name: 'Alpha', slug: 'alpha' });
      const ws = (await created.json()) as { id: string };

      const noCookieRes = await h.listMembers(null, ws.id);
      expect(noCookieRes.status).toBe(401);

      const unauthCreate = await h.createWorkspace(null, { name: 'Nope', slug: 'nope' });
      expect(unauthCreate.status).toBe(401);

      // Force the session into the past instead of waiting 30 days.
      await h.db.update(session).set({ expiresAt: new Date(Date.now() - 1000) });
      const expiredRes = await h.listMembers(cookie, ws.id);
      expect(expiredRes.status).toBe(401);
    } finally {
      await h.close();
    }
  });

  it('answers 403 for a nonexistent workspace (no existence oracle) and 400 for a malformed id', async () => {
    const h = await buildHarness();

    try {
      const cookie = await h.signIn('owner@example.com', '10.1.0.4');

      const unknownRes = await h.listMembers(cookie, '018f4f9e-7a3b-7c4d-9e1f-2a3b4c5d6e7f');
      expect(unknownRes.status).toBe(403);

      const malformedRes = await h.listMembers(cookie, 'not-a-uuid');
      expect(malformedRes.status).toBe(400);
      const body = (await malformedRes.json()) as { error: { code: string } };
      expect(body.error.code).toBe('validation_failed');
    } finally {
      await h.close();
    }
  });

  it('rejects a duplicate slug with 409 and an invalid body with 400', async () => {
    const h = await buildHarness();

    try {
      const cookie = await h.signIn('owner@example.com', '10.1.0.5');

      const first = await h.createWorkspace(cookie, { name: 'Alpha', slug: 'alpha' });
      expect(first.status).toBe(201);

      const dup = await h.createWorkspace(cookie, { name: 'Copy', slug: 'alpha' });
      expect(dup.status).toBe(409);

      const badBody = await h.createWorkspace(cookie, { name: '', slug: 'UPPER CASE' });
      expect(badBody.status).toBe(400);

      // A body that isn't JSON at all must also 400, not 500.
      const notJson = await h.app.request('/v1/workspaces', {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie },
        body: 'not json at all',
      });
      expect(notJson.status).toBe(400);
    } finally {
      await h.close();
    }
  });

  it('403s a soft-deleted workspace even for its own member', async () => {
    const h = await buildHarness();

    try {
      const cookie = await h.signIn('owner@example.com', '10.1.0.6');
      const created = await h.createWorkspace(cookie, { name: 'Alpha', slug: 'alpha' });
      const ws = (await created.json()) as { id: string };

      await h.db.update(workspaces).set({ deletedAt: new Date() }).where(eq(workspaces.id, ws.id));

      const res = await h.listMembers(cookie, ws.id);
      expect(res.status).toBe(403);
    } finally {
      await h.close();
    }
  });
});
