import { describe, expect, it } from 'vitest';
import { planSchema } from './index';

describe('planSchema', () => {
  it('accepts every documented billing plan', () => {
    for (const plan of ['free', 'pro', 'team']) {
      expect(planSchema.parse(plan)).toBe(plan);
    }
  });

  it('rejects a plan outside the documented set', () => {
    expect(() => planSchema.parse('enterprise')).toThrowError();
  });
});
