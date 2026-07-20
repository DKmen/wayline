import { describe, expect, it } from 'vitest';
import { isSameOriginPath } from './same-origin-path';

describe('isSameOriginPath', () => {
  it('accepts a same-origin relative path', () => {
    expect(isSameOriginPath('/settings')).toBe(true);
    expect(isSameOriginPath('/workspaces/123?tab=members')).toBe(true);
  });

  it('rejects an absolute URL — the open-redirect case', () => {
    expect(isSameOriginPath('https://evil.example.com/phish')).toBe(false);
  });

  it('rejects a protocol-relative URL', () => {
    expect(isSameOriginPath('//evil.example.com')).toBe(false);
  });

  it('rejects a dangerous-protocol URL', () => {
    expect(isSameOriginPath('javascript:alert(1)')).toBe(false);
  });

  it('rejects a path missing its leading slash', () => {
    expect(isSameOriginPath('settings')).toBe(false);
  });
});
