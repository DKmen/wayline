import { describe, expect, it } from 'vitest';
import { createTestDb } from '../test-client';
import { users } from './users';

describe('users schema', () => {
  it('inserts and reads back a user row with case-insensitive email lookup', async () => {
    const { db, close } = await createTestDb();

    try {
      await db.insert(users).values({ id: 'user_1', email: 'Person@Example.com', name: 'Ada' });
      const [found] = await db.select().from(users);

      // Non-null assertion: repo tsconfig sets noUncheckedIndexedAccess, which types
      // array-destructured elements as possibly undefined regardless of the preceding
      // insert; the row's presence is exactly what this test asserts next.
      expect(found!.email).toBe('Person@Example.com');
      expect(found!.emailVerified).toBe(false);
    } finally {
      await close();
    }
  });

  it('rejects a second user row with the same email in a different case (citext uniqueness)', async () => {
    const { db, close } = await createTestDb();

    try {
      await db.insert(users).values({ id: 'user_1', email: 'person@example.com' });

      await expect(
        db.insert(users).values({ id: 'user_2', email: 'PERSON@EXAMPLE.COM' }),
      ).rejects.toThrow();
    } finally {
      await close();
    }
  });
});
