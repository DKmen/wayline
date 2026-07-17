import { and, eq, type InferInsertModel, type SQL } from 'drizzle-orm';
import type {
  AnyPgColumn,
  PgDatabase,
  PgQueryResultHKT,
  PgTable,
  PgUpdateSetSource,
} from 'drizzle-orm/pg-core';
import * as schema from './schema';
import { auditLog, invitations, workspaceMembers } from './schema';

/** Any Drizzle Postgres database or transaction over the app schema — lets scoped ops compose with db.transaction(). */
export type DbExecutor = PgDatabase<PgQueryResultHKT, typeof schema>;

/** A table owned by one workspace — structurally, anything with a workspaceId column. */
export type TenantTable = PgTable & { workspaceId: AnyPgColumn };

// The `extends infer M` indirection forces eager evaluation: a lazy Omit<InferInsertModel<T>>
// in a generic parameter position breaks excess-property checking at call sites (TS2353).
type ScopedInsertValues<T extends PgTable> =
  InferInsertModel<T> extends infer M ? Omit<M, 'workspaceId'> : never;
type ScopedUpdateSet<T extends PgTable> =
  PgUpdateSetSource<T> extends infer M ? Omit<M, 'workspaceId'> : never;

/**
 * Registry of every tenant-owned table; the schema-integrity test asserts it matches
 * the set of tables carrying a workspace_id column, so new tenant tables can't skip it.
 */
export const TENANT_TABLES: readonly TenantTable[] = [auditLog, invitations, workspaceMembers];

/**
 * The only sanctioned way to touch a tenant-owned table (docs/03-architecture.md §3.3) —
 * every operation is pinned to one workspace: reads/updates/deletes are filtered by
 * workspace_id and inserts have it stamped, so a caller can neither omit nor override it.
 */
export function scopedDb(executor: DbExecutor, workspaceId: string) {
  return {
    workspaceId,
    select<T extends TenantTable>(table: T, where?: SQL) {
      return executor
        .select()
        .from(table as PgTable)
        .where(and(eq(table.workspaceId, workspaceId), where));
    },
    insert<T extends TenantTable>(table: T, values: ReadonlyArray<ScopedInsertValues<T>>) {
      // Spread first, stamp last: even a smuggled workspaceId in a value object is overwritten.
      const stamped = values.map((value) => ({ ...value, workspaceId }));
      return executor.insert(table).values(stamped as InferInsertModel<T>[]);
    },
    update<T extends TenantTable>(table: T, set: ScopedUpdateSet<T>, where?: SQL) {
      // Same runtime defense as insert: the Omit is compile-time only, so a loosely
      // typed object smuggling workspaceId could otherwise re-home rows across tenants.
      const { workspaceId: _ignored, ...safeSet } = set as Record<string, unknown>;
      return executor
        .update(table)
        .set(safeSet as PgUpdateSetSource<T>)
        .where(and(eq(table.workspaceId, workspaceId), where));
    },
    delete<T extends TenantTable>(table: T, where?: SQL) {
      return executor.delete(table).where(and(eq(table.workspaceId, workspaceId), where));
    },
  };
}
export type ScopedDb = ReturnType<typeof scopedDb>;
