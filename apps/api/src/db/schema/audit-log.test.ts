import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { createTestDb } from '../test-client';
import { auditLog } from './audit-log';
import { users } from './users';
import { workspaces } from './workspaces';

describe('audit_log schema', () => {
  it('inserts an audit event with jsonb meta defaulting to an empty object', async () => {
    const { db, close } = await createTestDb();

    try {
      await db.insert(users).values({ id: 'user_1', email: 'ada@example.com' });
      const [ws] = await db.insert(workspaces).values({ name: 'Acme', slug: 'acme' }).returning();
      await db.insert(auditLog).values({
        workspaceId: ws!.id,
        actorId: 'user_1',
        action: 'workspace.created',
        targetType: 'workspace',
        targetId: ws!.id,
      });

      const [event] = await db.select().from(auditLog);
      expect(event!.meta).toEqual({});
      expect(event!.action).toBe('workspace.created');
    } finally {
      await close();
    }
  });

  it('keeps the audit row with a null actor when the acting user is deleted (retention outlives accounts)', async () => {
    const { db, close } = await createTestDb();

    try {
      await db.insert(users).values({ id: 'user_1', email: 'ada@example.com' });
      const [ws] = await db.insert(workspaces).values({ name: 'Acme', slug: 'acme' }).returning();
      await db.insert(auditLog).values({
        workspaceId: ws!.id,
        actorId: 'user_1',
        action: 'member.removed',
        targetType: 'member',
      });

      await db.delete(users).where(eq(users.id, 'user_1'));

      const [event] = await db.select().from(auditLog);
      expect(event).toBeDefined();
      expect(event!.actorId).toBeNull();
    } finally {
      await close();
    }
  });
});
