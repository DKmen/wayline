import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('merges conditional class names, dropping falsy values', () => {
    const shouldInclude: boolean = false;
    expect(cn('a', shouldInclude && 'b', undefined, 'c')).toBe('a c');
  });

  it('resolves conflicting Tailwind utility classes to the last one', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
});
