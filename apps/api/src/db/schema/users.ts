import { sql } from 'drizzle-orm';
import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { citext } from './custom-types';

// Better Auth's core `user` model requires `emailVerified: boolean`; docs/04's
// `email_verified_at: timestamptz` intent is preserved via emailVerifiedAt, backfilled
// by lib/auth.ts's `databaseHooks.user.{create,update}.after` right after Better Auth
// flips emailVerified to true (Better Auth itself never writes emailVerifiedAt).
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: citext('email').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  emailVerified: boolean('email_verified').notNull().default(false),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});
