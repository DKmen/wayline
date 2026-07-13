import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError } from 'better-auth/api';
import { magicLink } from 'better-auth/plugins';
import { and, eq, isNull } from 'drizzle-orm';
import type { PgliteDatabase } from 'drizzle-orm/pglite';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../db/schema';
import type { Mailer } from './mailer';
import { checkAndRecordAttempt } from './rate-limit';
import { logSafe } from './logger';

type DrizzleLike = PostgresJsDatabase<typeof schema> | PgliteDatabase<typeof schema>;

const MAGIC_LINK_EXPIRY_SECONDS = 60 * 15; // docs/09-security-privacy.md §2: 15-min expiry
const SESSION_EXPIRY_SECONDS = 60 * 60 * 24 * 30; // 30d rolling (docs/09-security-privacy.md §2)
const SESSION_UPDATE_AGE_SECONDS = 60 * 60 * 24; // refresh the rolling window once per day

/**
 * Builds the Better Auth server instance: magic-link-only sign-in (no password, no
 * OAuth — Google deferred to WAYLI-90), Postgres sessions, and a per-email rate limit
 * layered on top of Better Auth's own per-IP limiting.
 */
export function createAuth(deps: {
  db: DrizzleLike;
  mailer: Mailer;
  secret: string;
  baseURL: string;
}) {
  // Better Auth's magic-link plugin only ever writes `emailVerified: true` (via
  // internalAdapter.createUser/updateUser); it never touches `emailVerifiedAt`. This
  // backfills it so docs/04's `email_verified_at: timestamptz` intent is actually met.
  const backfillEmailVerifiedAt = async (user: { id: string; emailVerified: boolean }) => {
    if (!user.emailVerified) return;
    await deps.db
      .update(schema.users)
      .set({ emailVerifiedAt: new Date() })
      .where(and(eq(schema.users.id, user.id), isNull(schema.users.emailVerifiedAt)));
  };

  return betterAuth({
    secret: deps.secret,
    baseURL: deps.baseURL,
    database: drizzleAdapter(deps.db, {
      provider: 'pg',
      schema: {
        user: schema.users,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    emailAndPassword: { enabled: false },
    session: {
      expiresIn: SESSION_EXPIRY_SECONDS,
      updateAge: SESSION_UPDATE_AGE_SECONDS,
    },
    // Magic-link verification either creates a brand-new user with emailVerified: true
    // (first-ever sign-in) or updates an existing unverified one — cover both hooks so
    // emailVerifiedAt gets backfilled either way. Runs against `deps.db` directly (not
    // ctx.context.internalAdapter), so it doesn't re-enter this same hook.
    databaseHooks: {
      user: {
        create: { after: backfillEmailVerifiedAt },
        update: { after: backfillEmailVerifiedAt },
      },
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 10,
      customRules: {
        '/sign-in/magic-link': { window: 60, max: 5 },
      },
    },
    plugins: [
      magicLink({
        expiresIn: MAGIC_LINK_EXPIRY_SECONDS,
        // Installed better-auth@1.6.23 defaults storeToken to "plain" — docs/09-security-
        // privacy.md §2 requires the stored token be a hash, so this must be explicit.
        storeToken: 'hashed',
        sendMagicLink: async ({ email, url }) => {
          // users.email is citext (case-insensitive) — normalize so `Foo@x.com` and
          // `foo@x.com` share one rate-limit bucket instead of each getting their own.
          const normalizedEmail = email.trim().toLowerCase();
          const { allowed } = await checkAndRecordAttempt(
            deps.db,
            `magic-link:email:${normalizedEmail}`,
            { max: 3, windowMs: 60_000 },
          );

          if (!allowed) {
            logSafe('auth.magic_link.rate_limited', { route: '/sign-in/magic-link' });
            // Plain Error would fall through better-call's router to a body-less 500 —
            // APIError is the only type its isAPIError branch turns into a real 429.
            throw new APIError('TOO_MANY_REQUESTS', { message: 'rate_limited' });
          }

          await deps.mailer.send({
            to: email,
            subject: 'Sign in to Wayline',
            html: `<p>Click to sign in: <a href="${url}">${url}</a></p><p>This link expires in 15 minutes and can only be used once.</p>`,
          });
          // Log only after the mailer resolves — logging before would falsely claim
          // success if `mailer.send` throws.
          logSafe('auth.magic_link.sent', { route: '/sign-in/magic-link' });
        },
      }),
    ],
  });
}
