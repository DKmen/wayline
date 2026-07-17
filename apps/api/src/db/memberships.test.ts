import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import {
  findMembershipWithWorkspace,
  listMembersWithUsers,
  touchLastActiveAt,
} from './memberships';
import { users, workspaceMembers, workspaces } from './schema';
import { scopedDb } from './scoped';
import { createTestDb } from './test-client';

type TestDb = Awaited<ReturnType<typeof createTestDb>>['db'];

async function seed(db: TestDb) {
  await db.insert(users).values([
    { id: 'user_a', email: 'a@example.com', name: 'Ada' },
    { id: 'user_b', email: 'b@example.com', name: 'Bob' },
  ]);
  const [wsA] = await db.insert(workspaces).values({ name: 'A', slug: 'ws-a' }).returning();
  const [wsB] = await db.insert(workspaces).values({ name: 'B', slug: 'ws-b' }).returning();
  await db.insert(workspaceMembers).values([
    { workspaceId: wsA!.id, userId: 'user_a', role: 'admin' },
    { workspaceId: wsB!.id, userId: 'user_b', role: 'viewer' },
  ]);
  return { wsA: wsA!, wsB: wsB! };
}

describe('findMembershipWithWorkspace', () => {
  it('returns the membership with its workspace for a member', async () => {
    const { db, close } = await createTestDb();

    try {
      const { wsA } = await seed(db);
      const membership = await findMembershipWithWorkspace(db, wsA.id, 'user_a');

      expect(membership).toMatchObject({
        role: 'admin',
        workspace: { id: wsA.id, name: 'A', slug: 'ws-a', plan: 'free' },
      });
    } finally {
      await close();
    }
  });

  it('returns null for a non-member (cross-workspace lookup)', async () => {
    const { db, close } = await createTestDb();

    try {
      const { wsB } = await seed(db);

      expect(await findMembershipWithWorkspace(db, wsB.id, 'user_a')).toBeNull();
    } finally {
      await close();
    }
  });

  it('returns null once the workspace is soft-deleted', async () => {
    const { db, close } = await createTestDb();

    try {
      const { wsA } = await seed(db);
      await db.update(workspaces).set({ deletedAt: new Date() }).where(eq(workspaces.id, wsA.id));

      expect(await findMembershipWithWorkspace(db, wsA.id, 'user_a')).toBeNull();
    } finally {
      await close();
    }
  });
});

describe('touchLastActiveAt', () => {
  it('sets last_active_at when null, then leaves a fresh value alone (throttle)', async () => {
    const { db, close } = await createTestDb();

    try {
      const { wsA } = await seed(db);
      const scoped = scopedDb(db, wsA.id);

      await touchLastActiveAt(scoped, 'user_a');
      const [afterFirst] = await db
        .select()
        .from(workspaceMembers)
        .where(eq(workspaceMembers.userId, 'user_a'));
      expect(afterFirst!.lastActiveAt).toBeInstanceOf(Date);

      await touchLastActiveAt(scoped, 'user_a');
      const [afterSecond] = await db
        .select()
        .from(workspaceMembers)
        .where(eq(workspaceMembers.userId, 'user_a'));
      expect(afterSecond!.lastActiveAt!.getTime()).toBe(afterFirst!.lastActiveAt!.getTime());
    } finally {
      await close();
    }
  });

  it('bumps last_active_at once the previous value is older than the throttle window', async () => {
    const { db, close } = await createTestDb();

    try {
      const { wsA } = await seed(db);
      const stale = new Date(Date.now() - 10 * 60 * 1000);
      await db
        .update(workspaceMembers)
        .set({ lastActiveAt: stale })
        .where(eq(workspaceMembers.userId, 'user_a'));

      await touchLastActiveAt(scopedDb(db, wsA.id), 'user_a');

      const [row] = await db
        .select()
        .from(workspaceMembers)
        .where(eq(workspaceMembers.userId, 'user_a'));
      expect(row!.lastActiveAt!.getTime()).toBeGreaterThan(stale.getTime());
    } finally {
      await close();
    }
  });
});

describe('listMembersWithUsers', () => {
  it('returns only the requested workspace members joined with identity', async () => {
    const { db, close } = await createTestDb();

    try {
      const { wsA } = await seed(db);
      const members = await listMembersWithUsers(db, wsA.id);

      expect(members).toEqual([
        { userId: 'user_a', name: 'Ada', email: 'a@example.com', role: 'admin' },
      ]);
    } finally {
      await close();
    }
  });
});
