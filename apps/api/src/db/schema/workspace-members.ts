import { roleSchema } from '@wayline/shared-types';
import { sql } from 'drizzle-orm';
import { index, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';
import { workspaces } from './workspaces';

/** Postgres enum derived from the shared role schema so DB and wire types cannot drift. */
export const workspaceRoleEnum = pgEnum('workspace_role', roleSchema.options);

/** Workspace membership (docs/04-data-model.md §2) — links a Better Auth user to one workspace with a role. */
export const workspaceMembers = pgTable(
  'workspace_members',
  {
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: workspaceRoleEnum('role').notNull(),
    // Updated by API middleware, throttled (docs/04 §2) — not on every request.
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.userId] }),
    // Hot path: "which workspaces does this user belong to" (docs/04 §7).
    index('workspace_members_user_id_idx').on(table.userId),
  ],
);
