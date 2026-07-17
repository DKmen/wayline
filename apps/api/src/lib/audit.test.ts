import { describe, expect, it } from 'vitest';
import { recordAuditEvent } from './audit';
import { auditLog, users, workspaces } from '../db/schema';
import { scopedDb } from '../db/scoped';
import { createTestDb } from '../db/test-client';

describe('recordAuditEvent', () => {
  it('writes a scoped audit row with defaults for optional fields', async () => {
    const { db, close } = await createTestDb();

    try {
      await db.insert(users).values({ id: 'user_a', email: 'a@example.com' });
      const [ws] = await db.insert(workspaces).values({ name: 'A', slug: 'ws-a' }).returning();

      await recordAuditEvent(scopedDb(db, ws!.id), {
        actorId: 'user_a',
        action: 'member.role_changed',
        targetType: 'member',
      });

      const [row] = await db.select().from(auditLog);
      expect(row).toMatchObject({
        workspaceId: ws!.id,
        actorId: 'user_a',
        action: 'member.role_changed',
        targetType: 'member',
        targetId: null,
        meta: {},
      });
    } finally {
      await close();
    }
  });

  it('persists explicit target and meta when provided', async () => {
    const { db, close } = await createTestDb();

    try {
      await db.insert(users).values({ id: 'user_a', email: 'a@example.com' });
      const [ws] = await db.insert(workspaces).values({ name: 'A', slug: 'ws-a' }).returning();

      await recordAuditEvent(scopedDb(db, ws!.id), {
        actorId: null,
        action: 'invitation.revoked',
        targetType: 'invitation',
        targetId: 'inv_1',
        meta: { reason: 'expired' },
      });

      const [row] = await db.select().from(auditLog);
      expect(row).toMatchObject({
        actorId: null,
        targetId: 'inv_1',
        meta: { reason: 'expired' },
      });
    } finally {
      await close();
    }
  });
});
