import { describe, expect, it } from 'vitest';
import { createTestDb } from '../test-client';
import { invitations } from './invitations';
import { users } from './users';
import { workspaces } from './workspaces';

async function seed(db: Awaited<ReturnType<typeof createTestDb>>['db']) {
  await db.insert(users).values({ id: 'user_1', email: 'ada@example.com' });
  const [ws] = await db.insert(workspaces).values({ name: 'Acme', slug: 'acme' }).returning();
  return ws!;
}

describe('invitations schema', () => {
  it('inserts a pending invitation with a hashed token', async () => {
    const { db, close } = await createTestDb();

    try {
      const ws = await seed(db);
      await db.insert(invitations).values({
        workspaceId: ws.id,
        email: 'invitee@example.com',
        role: 'creator',
        invitedBy: 'user_1',
        tokenHash: 'hash_1',
        expiresAt: new Date('2026-07-21T00:00:00Z'),
      });

      const [invite] = await db.select().from(invitations);
      expect(invite!.acceptedAt).toBeNull();
      expect(invite!.revokedAt).toBeNull();
      expect(invite!.tokenHash).toBe('hash_1');
    } finally {
      await close();
    }
  });

  it('rejects a second invitation reusing the same token hash (single-use tokens)', async () => {
    const { db, close } = await createTestDb();

    try {
      const ws = await seed(db);
      const base = {
        workspaceId: ws.id,
        role: 'creator' as const,
        invitedBy: 'user_1',
        tokenHash: 'hash_1',
        expiresAt: new Date('2026-07-21T00:00:00Z'),
      };
      await db.insert(invitations).values({ ...base, email: 'a@example.com' });

      await expect(
        db.insert(invitations).values({ ...base, email: 'b@example.com' }),
      ).rejects.toThrow();
    } finally {
      await close();
    }
  });
});
