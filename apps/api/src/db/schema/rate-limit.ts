import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/** One row per rate-limited attempt (e.g. `magic-link:email:<address>`) — see lib/rate-limit.ts. */
export const rateLimitAttempts = pgTable('rate_limit_attempts', {
  id: text('id').primaryKey(),
  key: text('key').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});
