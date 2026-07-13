import { describe, expect, it } from 'vitest';
import { createTestDb } from '../db/test-client';
import { checkAndRecordAttempt } from './rate-limit';

describe('checkAndRecordAttempt', () => {
  it('allows attempts up to the configured max within the window', async () => {
    const { db, close } = await createTestDb();

    try {
      const results = await Promise.all(
        Array.from({ length: 3 }, () =>
          checkAndRecordAttempt(db, 'magic-link:email:person@example.com', {
            max: 3,
            windowMs: 60_000,
          }),
        ),
      );

      expect(results.every((r) => r.allowed)).toBe(true);
    } finally {
      await close();
    }
  });

  it('rejects the attempt once the max is exceeded within the window', async () => {
    const { db, close } = await createTestDb();
    const key = 'magic-link:email:person@example.com';

    try {
      for (let i = 0; i < 3; i += 1) {
        await checkAndRecordAttempt(db, key, { max: 3, windowMs: 60_000 });
      }
      const fourth = await checkAndRecordAttempt(db, key, { max: 3, windowMs: 60_000 });

      expect(fourth.allowed).toBe(false);
    } finally {
      await close();
    }
  });

  it('scopes the limit per key — a different key is unaffected by another key’s attempts', async () => {
    const { db, close } = await createTestDb();

    try {
      for (let i = 0; i < 3; i += 1) {
        await checkAndRecordAttempt(db, 'magic-link:email:a@example.com', {
          max: 3,
          windowMs: 60_000,
        });
      }
      const other = await checkAndRecordAttempt(db, 'magic-link:email:b@example.com', {
        max: 3,
        windowMs: 60_000,
      });

      expect(other.allowed).toBe(true);
    } finally {
      await close();
    }
  });
});
