import { describe, expect, it } from 'vitest';
import { roleSchema } from './index';

describe('roleSchema', () => {
  it('accepts every documented workspace role', () => {
    for (const role of ['viewer', 'creator', 'admin']) {
      expect(roleSchema.parse(role)).toBe(role);
    }
  });

  it('rejects a role outside the documented set', () => {
    expect(() => roleSchema.parse('owner')).toThrowError();
  });
});
