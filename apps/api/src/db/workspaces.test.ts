import { describe, expect, it } from 'vitest';
import { ConflictError } from '../lib/errors';
import { auditLog, users, workspaceMembers, workspaces } from './schema';
import { createTestDb } from './test-client';
import { createWorkspaceWithAdmin } from './workspaces';

describe('createWorkspaceWithAdmin', () => {
  it('creates the workspace, first-admin membership, and audit trail atomically', async () => {
    const { db, close } = await createTestDb();

    try {
      await db.insert(users).values({ id: 'user_a', email: 'a@example.com' });

      const workspace = await createWorkspaceWithAdmin(db, {
        name: 'Acme',
        slug: 'acme',
        userId: 'user_a',
      });

      expect(workspace).toMatchObject({ name: 'Acme', slug: 'acme', plan: 'free' });

      const [member] = await db.select().from(workspaceMembers);
      expect(member).toMatchObject({ workspaceId: workspace.id, userId: 'user_a', role: 'admin' });

      const auditRows = await db.select().from(auditLog);
      expect(auditRows.map((row) => row.action).sort()).toEqual([
        'member.added',
        'workspace.created',
      ]);
      expect(auditRows.every((row) => row.workspaceId === workspace.id)).toBe(true);
    } finally {
      await close();
    }
  });

  it('rethrows a non-uniqueness failure untouched (FK violation is not a 409)', async () => {
    const { db, close } = await createTestDb();

    try {
      // No users seeded: the member insert violates its user FK, which must NOT be
      // translated into a client-facing ConflictError.
      const attempt = createWorkspaceWithAdmin(db, {
        name: 'Acme',
        slug: 'acme',
        userId: 'ghost_user',
      });

      await expect(attempt).rejects.toThrow();
      await expect(attempt).rejects.not.toBeInstanceOf(ConflictError);
      expect(await db.select().from(workspaces)).toHaveLength(0);
    } finally {
      await close();
    }
  });

  it('throws ConflictError on a duplicate slug and rolls back every row', async () => {
    const { db, close } = await createTestDb();

    try {
      await db.insert(users).values([
        { id: 'user_a', email: 'a@example.com' },
        { id: 'user_b', email: 'b@example.com' },
      ]);
      await createWorkspaceWithAdmin(db, { name: 'Acme', slug: 'acme', userId: 'user_a' });

      await expect(
        createWorkspaceWithAdmin(db, { name: 'Other', slug: 'ACME', userId: 'user_b' }),
      ).rejects.toBeInstanceOf(ConflictError);

      // The failed attempt must leave no partial rows: still one workspace, one member,
      // and only the first creation's two audit events.
      expect(await db.select().from(workspaces)).toHaveLength(1);
      expect(await db.select().from(workspaceMembers)).toHaveLength(1);
      expect(await db.select().from(auditLog)).toHaveLength(2);
    } finally {
      await close();
    }
  });
});
