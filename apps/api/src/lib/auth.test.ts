import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';
import { createTestDb } from '../db/test-client';
import { users } from '../db/schema/users';
import { createAuth } from './auth';

describe('createAuth', () => {
  it('constructs a Better Auth instance exposing a handler', async () => {
    const { db, close } = await createTestDb();

    try {
      const auth = createAuth({
        db,
        mailer: { send: vi.fn().mockResolvedValue(undefined) },
        secret: 'a'.repeat(32),
        baseURL: 'http://localhost:3000',
      });

      expect(auth.handler).toBeTypeOf('function');
    } finally {
      await close();
    }
  });

  describe('databaseHooks.user backfilling emailVerifiedAt', () => {
    async function buildAuthWithUser(overrides: { emailVerified: boolean }) {
      const { db, close } = await createTestDb();
      const auth = createAuth({
        db,
        mailer: { send: vi.fn().mockResolvedValue(undefined) },
        secret: 'a'.repeat(32),
        baseURL: 'http://localhost:3000',
      });
      const userId = 'user-1';
      await db.insert(users).values({
        id: userId,
        email: 'hooked@example.com',
        emailVerified: overrides.emailVerified,
      });

      return { db, auth, userId, close };
    }

    it('sets emailVerifiedAt when the create.after hook fires with emailVerified true', async () => {
      const { db, auth, userId, close } = await buildAuthWithUser({ emailVerified: true });

      try {
        await auth.options.databaseHooks?.user?.create?.after?.({
          id: userId,
          emailVerified: true,
        });

        const [row] = await db.select().from(users).where(eq(users.id, userId));
        expect(row?.emailVerifiedAt).toBeInstanceOf(Date);
      } finally {
        await close();
      }
    });

    it('leaves emailVerifiedAt untouched when the update.after hook fires with emailVerified still false', async () => {
      const { db, auth, userId, close } = await buildAuthWithUser({ emailVerified: false });

      try {
        await auth.options.databaseHooks?.user?.update?.after?.({
          id: userId,
          emailVerified: false,
        });

        const [row] = await db.select().from(users).where(eq(users.id, userId));
        expect(row?.emailVerifiedAt).toBeNull();
      } finally {
        await close();
      }
    });
  });
});
