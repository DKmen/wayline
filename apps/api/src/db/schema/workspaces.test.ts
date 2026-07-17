import { planSchema } from '@wayline/shared-types';
import { describe, expect, it } from 'vitest';
import { createTestDb } from '../test-client';
import { workspacePlanEnum, workspaces } from './workspaces';

describe('workspaces schema', () => {
  it('keeps the workspace_plan enum in lockstep with the shared planSchema', () => {
    expect(workspacePlanEnum.enumValues).toEqual(planSchema.options);
  });

  it('inserts a workspace with a generated uuid id and free plan default', async () => {
    const { db, close } = await createTestDb();

    try {
      await db.insert(workspaces).values({ name: 'Acme', slug: 'acme' });
      const [found] = await db.select().from(workspaces);

      expect(found!.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(found!.plan).toBe('free');
      expect(found!.deletedAt).toBeNull();
    } finally {
      await close();
    }
  });

  it('rejects a second workspace with the same slug in a different case (citext uniqueness)', async () => {
    const { db, close } = await createTestDb();

    try {
      await db.insert(workspaces).values({ name: 'Acme', slug: 'acme' });

      await expect(db.insert(workspaces).values({ name: 'Other', slug: 'ACME' })).rejects.toThrow();
    } finally {
      await close();
    }
  });
});
