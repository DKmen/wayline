import { describe, expect, it, vi, afterEach } from 'vitest';
import { logSafe } from './logger';

describe('logSafe', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs a JSON line containing only the event name and allow-listed fields', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    logSafe('auth.magic_link.requested', {
      route: '/api/auth/sign-in/magic-link',
      statusCode: 200,
    });

    expect(spy).toHaveBeenCalledTimes(1);
    // Non-null assertion: repo tsconfig sets noUncheckedIndexedAccess, so calls[0] is typed
    // as possibly undefined; the preceding expectation asserts it exists.
    const line = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(line).toEqual({
      event: 'auth.magic_link.requested',
      route: '/api/auth/sign-in/magic-link',
      statusCode: 200,
    });
  });

  it('drops a field whose key is not on the allow-list instead of logging it', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    logSafe('auth.magic_link.requested', {
      route: '/api/auth/sign-in/magic-link',
      // @ts-expect-error — exercising the runtime guard against a disallowed key
      email: 'person@example.com',
    });

    // Non-null assertion: repo tsconfig sets noUncheckedIndexedAccess, so calls[0] is typed
    // as possibly undefined; the expect call above asserts it exists.
    const line = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(line).not.toHaveProperty('email');
  });
});
