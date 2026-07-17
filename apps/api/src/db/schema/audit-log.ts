import { sql } from 'drizzle-orm';
import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { newId } from '../../lib/id';
import { users } from './users';
import { workspaces } from './workspaces';

/** Append-only audit trail (docs/04-data-model.md §5) — member/role/plan changes, written from day one. */
export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().$defaultFn(newId),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  // Nullable + SET NULL: audit rows are retained 24 months (docs/09 §3) and must outlive account deletion.
  actorId: text('actor_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id'),
  meta: jsonb('meta')
    .notNull()
    .default(sql`'{}'::jsonb`),
  // Append-only: no updated_at by design — rows are never mutated after insert.
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});
