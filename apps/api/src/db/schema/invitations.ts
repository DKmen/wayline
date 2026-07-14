import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { newId } from '../../lib/id';
import { citext } from './custom-types';
import { users } from './users';
import { workspaceRoleEnum } from './workspace-members';
import { workspaces } from './workspaces';

/** Workspace invitations (docs/04-data-model.md §2) — single-use hashed token, 7-day expiry; flows ship after S1. */
export const invitations = pgTable('invitations', {
  id: uuid('id').primaryKey().$defaultFn(newId),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  email: citext('email').notNull(),
  role: workspaceRoleEnum('role').notNull(),
  invitedBy: text('invited_by')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  // Only the hash is stored (docs/09-security-privacy.md §3) — the raw token goes out in the invite email.
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});
