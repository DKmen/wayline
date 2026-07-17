import { planSchema } from '@wayline/shared-types';
import { sql } from 'drizzle-orm';
import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { newId } from '../../lib/id';
import { citext } from './custom-types';

/** Postgres enum derived from the shared plan schema so DB and wire types cannot drift. */
export const workspacePlanEnum = pgEnum('workspace_plan', planSchema.options);

/** Tenant root (docs/04-data-model.md §2) — every scoped table hangs off workspaces.id. */
export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().$defaultFn(newId),
  name: text('name').notNull(),
  slug: citext('slug').notNull().unique(),
  // Denormalized from the future subscriptions table for hot-path entitlement checks (docs/04 §2).
  plan: workspacePlanEnum('plan').notNull().default('free'),
  // 7-day grace before hard cascade (docs/04 §2); soft-deleted workspaces are invisible to members.
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});
