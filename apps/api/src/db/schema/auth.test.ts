import { describe, expect, it } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { account, session } from './auth';
import { users } from './users';

// `session.userId`/`account.userId` declare `.references(() => users.id, ...)` —
// Drizzle stores that arrow function but only calls it when something resolves the
// foreign key (schema generation, introspection), never on a plain insert/select.
// Task 2 flagged these closures as unexercised; assert they actually resolve to
// `users.id` rather than trusting the reference target was typed correctly.
describe('session/account schema foreign keys', () => {
  it("resolves session.userId's foreign key to users.id", () => {
    const [foreignKey] = getTableConfig(session).foreignKeys;
    const { foreignColumns, foreignTable } = foreignKey!.reference();

    expect(foreignTable).toBe(users);
    expect(foreignColumns).toEqual([users.id]);
    expect(foreignKey!.onDelete).toBe('cascade');
  });

  it("resolves account.userId's foreign key to users.id", () => {
    const [foreignKey] = getTableConfig(account).foreignKeys;
    const { foreignColumns, foreignTable } = foreignKey!.reference();

    expect(foreignTable).toBe(users);
    expect(foreignColumns).toEqual([users.id]);
    expect(foreignKey!.onDelete).toBe('cascade');
  });
});
