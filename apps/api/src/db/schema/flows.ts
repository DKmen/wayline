import { flowStatusSchema } from '@wayline/shared-types';
import { sql } from 'drizzle-orm';
import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { newId } from '../../lib/id';
import { users } from './users';
import { workspaces } from './workspaces';

/** Postgres enum derived from the shared flow-status schema so DB and wire types cannot drift. */
export const flowStatusEnum = pgEnum('flow_status', flowStatusSchema.options);

/**
 * A workspace's flows (docs/04-data-model.md §3) — the library WAYLI-30 lands users in.
 * `currentVersionId` is a plain column with no FK yet: `flow_versions` doesn't exist until
 * S3, which adds the constraint once it lands — this table only ever holds rows once S3
 * ships flow creation, so leaving the FK off avoids modeling a table this ticket doesn't need.
 */
export const flows = pgTable(
  'flows',
  {
    id: uuid('id').primaryKey().$defaultFn(newId),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    status: flowStatusEnum('status').notNull().default('draft_local'),
    currentVersionId: uuid('current_version_id'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [index('flows_workspace_id_idx').on(table.workspaceId)],
);
