import { describe, expect, it } from 'vitest';
import { hostPermissionPatternFor } from './hostPermissionPattern';

describe('hostPermissionPatternFor', () => {
  it('derives a per-site pattern from an https URL with a path and query', () => {
    expect(hostPermissionPatternFor('https://example.com/checkout?x=1')).toBe(
      'https://example.com/*',
    );
  });

  it('derives a per-site pattern from an http URL, dropping the port', () => {
    expect(hostPermissionPatternFor('http://localhost:4300/')).toBe('http://localhost/*');
  });

  it('returns null for a non-http(s) scheme', () => {
    expect(hostPermissionPatternFor('chrome://extensions/')).toBeNull();
  });

  it('returns null for a string that is not a valid URL', () => {
    expect(hostPermissionPatternFor('not a url')).toBeNull();
  });
});
