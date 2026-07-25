import { describe, expect, it } from 'vitest';
import { API_BASE_URL } from './config';

describe('API_BASE_URL', () => {
  it('is a non-empty absolute URL', () => {
    expect(API_BASE_URL.length).toBeGreaterThan(0);
    expect(() => new URL(API_BASE_URL)).not.toThrow();
  });
});
