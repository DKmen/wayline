import { describe, expect, it } from 'vitest';
import { magicLinkRequestSchema, sessionResponseSchema, sessionUserSchema } from './index';

describe('sessionUserSchema', () => {
  it('accepts a Better Auth user with a null name and tolerates extra fields', () => {
    const user = { id: 'user_1', email: 'ada@example.com', name: null, emailVerified: true };
    expect(sessionUserSchema.parse(user)).toMatchObject({ id: 'user_1', email: 'ada@example.com' });
  });

  it('rejects a missing id and a malformed email', () => {
    expect(() => sessionUserSchema.parse({ email: 'ada@example.com', name: null })).toThrowError();
    expect(() =>
      sessionUserSchema.parse({ id: 'user_1', email: 'nope', name: null }),
    ).toThrowError();
  });
});

describe('sessionResponseSchema', () => {
  const valid = {
    session: { expiresAt: '2026-08-01T00:00:00.000Z', token: 'tok_1' },
    user: { id: 'user_1', email: 'ada@example.com', name: 'Ada' },
  };

  it('accepts a live session and a signed-out null', () => {
    expect(sessionResponseSchema.parse(valid)).toMatchObject({
      session: { expiresAt: '2026-08-01T00:00:00.000Z' },
      user: { id: 'user_1', email: 'ada@example.com' },
    });
    expect(sessionResponseSchema.parse(null)).toBeNull();
  });

  it('rejects a session object missing its user', () => {
    expect(() => sessionResponseSchema.parse({ session: valid.session })).toThrowError();
  });
});

describe('magicLinkRequestSchema', () => {
  it('accepts an email and callback URL', () => {
    const body = { email: 'ada@example.com', callbackURL: 'http://localhost:4400/' };
    expect(magicLinkRequestSchema.parse(body)).toEqual(body);
  });

  it('rejects a malformed email and unknown keys', () => {
    expect(() =>
      magicLinkRequestSchema.parse({ email: 'nope', callbackURL: 'http://localhost:4400/' }),
    ).toThrowError();
    expect(() =>
      magicLinkRequestSchema.parse({
        email: 'ada@example.com',
        callbackURL: 'http://localhost:4400/',
        extra: 1,
      }),
    ).toThrowError();
  });
});
