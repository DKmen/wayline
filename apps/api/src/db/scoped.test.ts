import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { scopedDb } from './scoped';
import { auditLog, users, workspaceMembers, workspaces } from './schema';
import { createTestDb } from './test-client';

type TestDb = Awaited<ReturnType<typeof createTestDb>>['db'];

/** Two workspaces, two users, one membership + audit row each — the canonical isolation fixture. */
async function seedTwoWorkspaces(db: TestDb) {
  await db.insert(users).values([
    { id: 'user_a', email: 'a@example.com' },
    { id: 'user_b', email: 'b@example.com' },
  ]);
  const [wsA] = await db.insert(workspaces).values({ name: 'A', slug: 'ws-a' }).returning();
  const [wsB] = await db.insert(workspaces).values({ name: 'B', slug: 'ws-b' }).returning();
  await db.insert(workspaceMembers).values([
    { workspaceId: wsA!.id, userId: 'user_a', role: 'admin' },
    { workspaceId: wsB!.id, userId: 'user_b', role: 'admin' },
  ]);
  return { wsA: wsA!, wsB: wsB! };
}

describe('scopedDb', () => {
  it('select returns only the scoped workspace rows', async () => {
    const { db, close } = await createTestDb();

    try {
      const { wsA } = await seedTwoWorkspaces(db);
      const rows = await scopedDb(db, wsA.id).select(workspaceMembers);

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ workspaceId: wsA.id, userId: 'user_a' });
    } finally {
      await close();
    }
  });

  it('select never sees the other workspace even with a caller-supplied filter for it', async () => {
    const { db, close } = await createTestDb();

    try {
      const { wsA, wsB } = await seedTwoWorkspaces(db);
      const rows = await scopedDb(db, wsA.id).select(
        workspaceMembers,
        eq(workspaceMembers.workspaceId, wsB.id),
      );

      expect(rows).toHaveLength(0);
    } finally {
      await close();
    }
  });

  it('insert stamps the scoped workspaceId even when a caller smuggles a different one', async () => {
    const { db, close } = await createTestDb();

    try {
      const { wsA, wsB } = await seedTwoWorkspaces(db);
      await scopedDb(db, wsA.id).insert(auditLog, [
        {
          // A compile-time Omit can't stop a spread at runtime — prove the overwrite.
          ...({ workspaceId: wsB.id } as object),
          actorId: 'user_a',
          action: 'member.added',
          targetType: 'member',
        },
      ]);

      const [row] = await db.select().from(auditLog);
      expect(row!.workspaceId).toBe(wsA.id);
    } finally {
      await close();
    }
  });

  it('update touches only the scoped workspace rows', async () => {
    const { db, close } = await createTestDb();

    try {
      const { wsA, wsB } = await seedTwoWorkspaces(db);
      await scopedDb(db, wsA.id).update(workspaceMembers, { role: 'viewer' });

      const [memberA] = await db
        .select()
        .from(workspaceMembers)
        .where(eq(workspaceMembers.workspaceId, wsA.id));
      const [memberB] = await db
        .select()
        .from(workspaceMembers)
        .where(eq(workspaceMembers.workspaceId, wsB.id));
      expect(memberA!.role).toBe('viewer');
      expect(memberB!.role).toBe('admin');
    } finally {
      await close();
    }
  });

  it('delete removes only the scoped workspace rows', async () => {
    const { db, close } = await createTestDb();

    try {
      const { wsA, wsB } = await seedTwoWorkspaces(db);
      await scopedDb(db, wsA.id).delete(workspaceMembers);

      const remaining = await db.select().from(workspaceMembers);
      expect(remaining).toHaveLength(1);
      expect(remaining[0]!.workspaceId).toBe(wsB.id);
    } finally {
      await close();
    }
  });

  it('composes with a transaction executor and supports returning()', async () => {
    const { db, close } = await createTestDb();

    try {
      const { wsA } = await seedTwoWorkspaces(db);
      const inserted = await db.transaction(async (tx) => {
        return scopedDb(tx, wsA.id)
          .insert(auditLog, [
            { actorId: 'user_a', action: 'workspace.created', targetType: 'workspace' },
          ])
          .returning();
      });

      expect(inserted).toHaveLength(1);
      expect(inserted[0]!.workspaceId).toBe(wsA.id);
    } finally {
      await close();
    }
  });
});
