import { describe, expect, it } from 'vitest';
import { listFlows } from './flows';
import { flows, users, workspaces } from './schema';
import { scopedDb } from './scoped';
import { createTestDb } from './test-client';

type TestDb = Awaited<ReturnType<typeof createTestDb>>['db'];

async function seedTwoWorkspaces(db: TestDb) {
  await db.insert(users).values({ id: 'user_a', email: 'a@example.com' });
  const [wsA] = await db.insert(workspaces).values({ name: 'A', slug: 'ws-a' }).returning();
  const [wsB] = await db.insert(workspaces).values({ name: 'B', slug: 'ws-b' }).returning();
  return { wsA: wsA!, wsB: wsB! };
}

describe('listFlows', () => {
  it('returns an empty list for a workspace with no flows', async () => {
    const { db, close } = await createTestDb();

    try {
      const { wsA } = await seedTwoWorkspaces(db);

      expect(await listFlows(scopedDb(db, wsA.id))).toEqual([]);
    } finally {
      await close();
    }
  });

  it('excludes soft-deleted flows and never sees another workspace’s flows', async () => {
    const { db, close } = await createTestDb();

    try {
      const { wsA, wsB } = await seedTwoWorkspaces(db);
      await db.insert(flows).values([
        { workspaceId: wsA.id, createdBy: 'user_a', title: 'Live flow' },
        { workspaceId: wsA.id, createdBy: 'user_a', title: 'Deleted flow', deletedAt: new Date() },
        { workspaceId: wsB.id, createdBy: 'user_a', title: 'Other workspace flow' },
      ]);

      const result = await listFlows(scopedDb(db, wsA.id));

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ title: 'Live flow', workspaceId: wsA.id });
    } finally {
      await close();
    }
  });
});
