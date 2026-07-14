import { roleSchema } from '@wayline/shared-types';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { createTestDb } from '../test-client';
import { users } from './users';
import { workspaceMembers, workspaceRoleEnum } from './workspace-members';
import { workspaces } from './workspaces';

describe('workspace_members schema', () => {
  it('keeps the workspace_role enum in lockstep with the shared roleSchema', () => {
    expect(workspaceRoleEnum.enumValues).toEqual(roleSchema.options);
  });

  it('inserts a membership linking a Better Auth user to a workspace', async () => {
    const { db, close } = await createTestDb();

    try {
      await db.insert(users).values({ id: 'user_1', email: 'ada@example.com' });
      const [ws] = await db.insert(workspaces).values({ name: 'Acme', slug: 'acme' }).returning();
      await db
        .insert(workspaceMembers)
        .values({ workspaceId: ws!.id, userId: 'user_1', role: 'admin' });

      const [member] = await db.select().from(workspaceMembers);
      expect(member!.role).toBe('admin');
      expect(member!.userId).toBe('user_1');
    } finally {
      await close();
    }
  });

  it('rejects a duplicate membership for the same workspace and user (composite PK)', async () => {
    const { db, close } = await createTestDb();

    try {
      await db.insert(users).values({ id: 'user_1', email: 'ada@example.com' });
      const [ws] = await db.insert(workspaces).values({ name: 'Acme', slug: 'acme' }).returning();
      await db
        .insert(workspaceMembers)
        .values({ workspaceId: ws!.id, userId: 'user_1', role: 'admin' });

      await expect(
        db
          .insert(workspaceMembers)
          .values({ workspaceId: ws!.id, userId: 'user_1', role: 'viewer' }),
      ).rejects.toThrow();
    } finally {
      await close();
    }
  });

  it('cascades membership deletion when the workspace is deleted', async () => {
    const { db, close } = await createTestDb();

    try {
      await db.insert(users).values({ id: 'user_1', email: 'ada@example.com' });
      const [ws] = await db.insert(workspaces).values({ name: 'Acme', slug: 'acme' }).returning();
      await db
        .insert(workspaceMembers)
        .values({ workspaceId: ws!.id, userId: 'user_1', role: 'admin' });

      await db.delete(workspaces).where(eq(workspaces.id, ws!.id));

      expect(await db.select().from(workspaceMembers)).toHaveLength(0);
    } finally {
      await close();
    }
  });
});
