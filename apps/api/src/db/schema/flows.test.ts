import { flowStatusSchema } from '@wayline/shared-types';
import { describe, expect, it } from 'vitest';
import { createTestDb } from '../test-client';
import { users } from './users';
import { flowStatusEnum, flows } from './flows';
import { workspaces } from './workspaces';

describe('flows schema', () => {
  it('keeps the flow_status enum in lockstep with the shared flowStatusSchema', () => {
    expect(flowStatusEnum.enumValues).toEqual(flowStatusSchema.options);
  });

  it('inserts a flow with a generated uuid id and draft_local status default', async () => {
    const { db, close } = await createTestDb();

    try {
      await db.insert(users).values({ id: 'user_1', email: 'ada@example.com', name: 'Ada' });
      const [workspace] = await db
        .insert(workspaces)
        .values({ name: 'Acme', slug: 'acme' })
        .returning();
      await db.insert(flows).values({
        workspaceId: workspace!.id,
        createdBy: 'user_1',
        title: 'Reset your password',
      });
      const [found] = await db.select().from(flows);

      expect(found!.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(found!.status).toBe('draft_local');
      expect(found!.currentVersionId).toBeNull();
      expect(found!.deletedAt).toBeNull();
    } finally {
      await close();
    }
  });
});
