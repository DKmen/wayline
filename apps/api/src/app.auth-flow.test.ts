import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';
import { createTestDb } from './db/test-client';
import { createAuth } from './lib/auth';
import { createApp } from './app';
import { verification } from './db/schema/auth';
import { users } from './db/schema/users';

async function buildHarness() {
  const { db, close } = await createTestDb();
  const sentMail: { to: string; html: string }[] = [];
  const mailer = {
    send: vi.fn(async (message: { to: string; subject: string; html: string }) => {
      sentMail.push({ to: message.to, html: message.html });
    }),
  };
  const auth = createAuth({ db, mailer, secret: 'a'.repeat(32), baseURL: 'http://localhost:3000' });
  const app = createApp(auth);

  return { app, db, sentMail, close };
}

function extractMagicLinkUrl(html: string): string {
  const match = html.match(/href="([^"]+)"/);
  if (!match) throw new Error('no link found in mail body');
  // Non-null assertion: noUncheckedIndexedAccess types capture groups as possibly
  // undefined regardless of the pattern; the preceding `if (!match)` already proved
  // the regex (which has exactly one capturing group) matched.
  return match[1]!;
}

// Better Auth's own IP+path rate limiter (both its default magic-link plugin rule
// and this app's `customRules` override) lives in a module-level `Map`, not the
// per-test PGlite db — it survives across `it()` blocks in this file. Better
// Auth resolves the client IP from `x-forwarded-for` before falling back to a
// fixed loopback constant in test/dev (`@better-auth/core`'s `getIp`), so giving
// each test a distinct fake IP keeps its rate-limit bucket independent of
// whatever other tests in this file already did on the same path.
function requestMagicLink(app: ReturnType<typeof createApp>, email: string, ip: string) {
  return app.request('/api/auth/sign-in/magic-link', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({ email }),
  });
}

function followVerifyLink(app: ReturnType<typeof createApp>, verifyPath: string, ip: string) {
  return app.request(verifyPath, { redirect: 'manual', headers: { 'x-forwarded-for': ip } });
}

describe('passwordless auth flow', () => {
  // Better Auth's magic-link plugin always writes a `callbackURL` query param onto
  // the mailed link (defaulting to "/" when the caller doesn't supply one), so the
  // verify endpoint never takes its JSON-response branch for a real emailed link —
  // it always throws a redirect (better-call maps `ctx.redirect` to HTTP 302 via the
  // "FOUND" APIError code). Success and rejection are told apart by the Location
  // target and the presence of a session `set-cookie`, not by status code alone.
  it('completes sign-in: request a magic link, verify it, and receive a session cookie', async () => {
    const { app, db, sentMail, close } = await buildHarness();

    try {
      const requestRes = await requestMagicLink(app, 'person@example.com', '10.0.0.1');
      expect(requestRes.status).toBe(200);
      expect(await requestRes.json()).toEqual({ status: true });
      expect(sentMail).toHaveLength(1);

      // Non-null assertion: noUncheckedIndexedAccess types this as possibly undefined,
      // but the `toHaveLength(1)` assertion above already proved the row exists.
      const magicLinkUrl = extractMagicLinkUrl(sentMail[0]!.html);
      const verifyPath = magicLinkUrl.replace('http://localhost:3000', '');

      const verifyRes = await followVerifyLink(app, verifyPath, '10.0.0.1');

      expect(verifyRes.status).toBe(302);
      expect(verifyRes.headers.get('location')).not.toContain('error=');
      const setCookie = verifyRes.headers.get('set-cookie');
      expect(setCookie).toBeTruthy();
      expect(setCookie).toContain('better-auth.session_token');

      // lib/auth.ts's databaseHooks backfill emailVerifiedAt right after Better Auth
      // flips emailVerified to true — proves the column isn't left NULL forever.
      const [persistedUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, 'person@example.com'));
      expect(persistedUser?.emailVerified).toBe(true);
      expect(persistedUser?.emailVerifiedAt).toBeInstanceOf(Date);
    } finally {
      await close();
    }
  });

  it('rejects an expired magic-link token', async () => {
    const { app, db, sentMail, close } = await buildHarness();

    try {
      await requestMagicLink(app, 'expired@example.com', '10.0.0.2');

      // Force the stored verification row into the past instead of waiting 15 real minutes.
      await db.update(verification).set({ expiresAt: new Date(Date.now() - 1000) });

      // Non-null assertion: noUncheckedIndexedAccess types this as possibly undefined;
      // the request above always sends exactly one mail per call.
      const magicLinkUrl = extractMagicLinkUrl(sentMail[0]!.html);
      const verifyPath = magicLinkUrl.replace('http://localhost:3000', '');
      const verifyRes = await followVerifyLink(app, verifyPath, '10.0.0.2');

      // Better Auth's verify endpoint redirects on failure (`error=INVALID_TOKEN`)
      // rather than returning a 4xx — the same expired/consumed row also reaches the
      // reused-token path below, so no session cookie is the load-bearing assertion.
      expect(verifyRes.status).toBe(302);
      expect(verifyRes.headers.get('location')).toContain('error=INVALID_TOKEN');
      expect(verifyRes.headers.get('set-cookie')).toBeFalsy();
    } finally {
      await close();
    }
  });

  it('rejects reusing a magic-link token a second time', async () => {
    const { app, sentMail, close } = await buildHarness();

    try {
      await requestMagicLink(app, 'reuse@example.com', '10.0.0.3');

      // Non-null assertion: noUncheckedIndexedAccess types this as possibly undefined;
      // the request above always sends exactly one mail per call.
      const magicLinkUrl = extractMagicLinkUrl(sentMail[0]!.html);
      const verifyPath = magicLinkUrl.replace('http://localhost:3000', '');

      const first = await followVerifyLink(app, verifyPath, '10.0.0.3');
      expect(first.status).toBe(302);
      expect(first.headers.get('set-cookie')).toBeTruthy();

      // Better Auth consumes the verification row atomically on first use, so a
      // second hit against the identical URL must find nothing to consume.
      const second = await followVerifyLink(app, verifyPath, '10.0.0.3');
      expect(second.status).toBe(302);
      expect(second.headers.get('location')).toContain('error=INVALID_TOKEN');
      expect(second.headers.get('set-cookie')).toBeFalsy();
    } finally {
      await close();
    }
  });

  it('rejects magic-link requests once the per-email rate limit is exceeded', async () => {
    const { app, close } = await buildHarness();
    const requestOnce = () => requestMagicLink(app, 'rate-limited@example.com', '10.0.0.4');

    try {
      // The app's own per-email limiter (max: 3 per 60s, inside sendMagicLink) is
      // stricter than Better Auth's own per-IP rule for this route (max: 5 per 60s,
      // from both the magic-link plugin's default and this app's `customRules`
      // override) and fires first: the 4th request in the same window is rejected
      // before Better Auth's own counter would ever trip.
      const first = await requestOnce();
      const second = await requestOnce();
      const third = await requestOnce();
      const fourth = await requestOnce();

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(third.status).toBe(200);
      expect(fourth.status).toBe(429);

      // A bare 429 could come from either limiter — pin it to the per-email one
      // specifically. `sendMagicLink` throws `APIError('TOO_MANY_REQUESTS', { message:
      // 'rate_limited' })` (apps/api/src/lib/auth.ts), which better-call serializes as
      // this exact JSON body; Better Auth's own per-IP `customRules` rejection would
      // carry a different message (e.g. "Too many requests"), not "rate_limited".
      expect(await fourth.json()).toEqual({ message: 'rate_limited' });

      // Further proof it's the per-email bucket, not the per-IP one: a different email
      // on the *same* IP still succeeds, even though that IP has now made 4 requests
      // against a per-IP limiter (customRules max: 5/60s) that hasn't tripped yet —
      // so the 429 above could only have come from rate-limited@example.com's own bucket.
      const differentEmailSameIp = await requestMagicLink(
        app,
        'still-fine@example.com',
        '10.0.0.4',
      );
      expect(differentEmailSameIp.status).toBe(200);
    } finally {
      await close();
    }
  });

  it('shares one per-email rate-limit bucket across case variants of the same address', async () => {
    const { app, close } = await buildHarness();

    try {
      // users.email is citext — `Case@Example.com` and `case@example.com` are the same
      // account, so they must share one rate-limit bucket, not get one each.
      const first = await requestMagicLink(app, 'Case@Example.com', '10.0.0.5');
      const second = await requestMagicLink(app, 'case@example.com', '10.0.0.5');
      const third = await requestMagicLink(app, 'CASE@EXAMPLE.COM', '10.0.0.5');
      const fourth = await requestMagicLink(app, 'cAsE@example.com', '10.0.0.5');

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(third.status).toBe(200);
      expect(fourth.status).toBe(429);
      expect(await fourth.json()).toEqual({ message: 'rate_limited' });
    } finally {
      await close();
    }
  });
});
