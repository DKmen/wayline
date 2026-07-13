import { randomUUID } from 'node:crypto';
import { and, gte, count, eq } from 'drizzle-orm';
import type { PgliteDatabase } from 'drizzle-orm/pglite';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../db/schema';
import { rateLimitAttempts } from '../db/schema/rate-limit';

type DrizzleLike = PostgresJsDatabase<typeof schema> | PgliteDatabase<typeof schema>;

/**
 * Sliding-window limiter: records this attempt for `key` first, then counts all rows
 * (including the just-inserted one) created within the last `windowMs`
 * (docs/09-security-privacy.md §2 — auth endpoints are rate-limited per email/IP).
 * Postgres-backed per docs/03-architecture.md §7 ("Rate limiting ... Postgres-backed
 * at v1; Redis only if it becomes hot"). Insert-then-count (rather than count-then-
 * insert) makes the check monotonic under concurrent requests for the same key — a
 * stale pre-insert count can no longer let an unbounded number of requests all read
 * "0" and all be allowed; a burst can still admit a few extra over `max`, bounded by
 * true concurrency rather than the whole window.
 */
export async function checkAndRecordAttempt(
  db: DrizzleLike,
  key: string,
  opts: { max: number; windowMs: number },
): Promise<{ allowed: boolean }> {
  const windowStart = new Date(Date.now() - opts.windowMs);

  await db.insert(rateLimitAttempts).values({ id: randomUUID(), key });

  const rows = await db
    .select({ value: count() })
    .from(rateLimitAttempts)
    .where(and(eq(rateLimitAttempts.key, key), gte(rateLimitAttempts.createdAt, windowStart)));
  // count() always returns exactly one row, but noUncheckedIndexedAccess (tsconfig.base.json)
  // types array access as possibly-undefined — fall back to 0 to satisfy the compiler.
  const recent = rows[0]?.value ?? 0;

  return { allowed: recent <= opts.max };
}
