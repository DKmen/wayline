import { describe, expect, it, vi } from 'vitest';
import {
  isWaylineSessionCookieRemoved,
  registerCookieWatcher,
  WAYLINE_SESSION_COOKIE_NAME,
} from './cookie-watcher';

// Plain structural object, not chrome.cookies.CookieChangeInfo — apps/extension has no
// @types/chrome dependency (it types the browser via wxt/browser's webextension-polyfill
// typings instead), and cookie-watcher.ts's own CookieChangeInfo type is intentionally
// this same narrow shape, not the full chrome.* ambient type.
function changeInfo(removed: boolean, cookieName: string) {
  return { removed, cookie: { name: cookieName } };
}

describe('isWaylineSessionCookieRemoved', () => {
  it('is true when the Wayline session cookie is removed', () => {
    expect(isWaylineSessionCookieRemoved(changeInfo(true, WAYLINE_SESSION_COOKIE_NAME))).toBe(true);
  });

  it('is false when the cookie is set/updated rather than removed', () => {
    expect(isWaylineSessionCookieRemoved(changeInfo(false, WAYLINE_SESSION_COOKIE_NAME))).toBe(
      false,
    );
  });

  it('is false for a different cookie being removed', () => {
    expect(isWaylineSessionCookieRemoved(changeInfo(true, 'some-other-cookie'))).toBe(false);
  });
});

describe('registerCookieWatcher', () => {
  it('calls onSignedOut when the Wayline session cookie is removed', () => {
    const addListener = vi.fn();
    const onSignedOut = vi.fn();

    registerCookieWatcher(onSignedOut, { addListener });

    const listener = addListener.mock.calls[0]![0] as (info: unknown) => void;
    listener(changeInfo(true, WAYLINE_SESSION_COOKIE_NAME));

    expect(onSignedOut).toHaveBeenCalledOnce();
  });

  it('does not call onSignedOut for an unrelated cookie change', () => {
    const addListener = vi.fn();
    const onSignedOut = vi.fn();

    registerCookieWatcher(onSignedOut, { addListener });

    const listener = addListener.mock.calls[0]![0] as (info: unknown) => void;
    listener(changeInfo(true, 'some-other-cookie'));

    expect(onSignedOut).not.toHaveBeenCalled();
  });
});
