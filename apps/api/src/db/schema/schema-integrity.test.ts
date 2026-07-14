import { getTableName } from 'drizzle-orm';
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { TENANT_TABLES } from '../scoped';
import * as schema from './index';

// Widen to unknown[] first: the barrel's value union (tables + pgEnums) rejects a
// `value is PgTable` predicate under exactOptionalPropertyTypes.
const allTables = (Object.values(schema) as unknown[]).filter(
  (value): value is PgTable => value instanceof PgTable,
);

describe('schema integrity (WAYLI-28 acceptance)', () => {
  it('contains exactly the known tables — a parallel identity or unregistered table fails the build', () => {
    const names = allTables.map((table) => getTableName(table)).sort();

    expect(names).toEqual([
      'account',
      'audit_log',
      'invitations',
      'rate_limit_attempts',
      'session',
      'users',
      'verification',
      'workspace_members',
      'workspaces',
    ]);
  });

  it('resolves every identity-referencing FK to users.id — Better Auth users are the single source of truth', () => {
    const identityFkColumns: string[] = [];

    for (const table of allTables) {
      const { foreignKeys, name } = getTableConfig(table);
      for (const fk of foreignKeys) {
        const ref = fk.reference();
        const foreignTable = getTableName(ref.foreignTable);
        const referencesUsersId =
          foreignTable === 'users' && ref.foreignColumns.every((col) => col.name === 'id');
        const touchesUserColumn = ref.columns.some((col) =>
          ['user_id', 'invited_by', 'actor_id'].includes(col.name),
        );

        if (touchesUserColumn) {
          expect(referencesUsersId).toBe(true);
          identityFkColumns.push(`${name}.${ref.columns.map((col) => col.name).join(',')}`);
        }
      }
    }

    expect(identityFkColumns.sort()).toEqual([
      'account.user_id',
      'audit_log.actor_id',
      'invitations.invited_by',
      'session.user_id',
      'workspace_members.user_id',
    ]);
  });

  it('registers every table owning a workspace_id column in TENANT_TABLES, and nothing else', () => {
    const tablesWithWorkspaceId = allTables
      .filter((table) => getTableConfig(table).columns.some((col) => col.name === 'workspace_id'))
      .map((table) => getTableName(table))
      .sort();
    const registered = TENANT_TABLES.map((table) => getTableName(table)).sort();

    expect(registered).toEqual(tablesWithWorkspaceId);
  });
});
