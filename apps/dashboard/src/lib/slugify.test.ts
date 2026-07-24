import { describe, expect, it } from 'vitest';
import { slugify } from './slugify';

describe('slugify', () => {
  it('lowercases and hyphenates a typical workspace name', () => {
    expect(slugify('Acme Corp')).toBe('acme-corp');
  });

  it('collapses consecutive punctuation/spaces into a single hyphen', () => {
    expect(slugify('Acme --- Corp!!')).toBe('acme-corp');
  });

  it('strips leading and trailing punctuation instead of leaving a dangling hyphen', () => {
    expect(slugify('  ~Acme Corp~  ')).toBe('acme-corp');
  });

  it('strips accents so unicode names produce a plain ascii slug', () => {
    expect(slugify('Café Résumé')).toBe('cafe-resume');
  });

  it('strips emoji and other symbols entirely', () => {
    expect(slugify('Acme 🚀 Corp')).toBe('acme-corp');
  });

  it('clamps to 63 characters without leaving a trailing hyphen', () => {
    const longName = 'a'.repeat(70);

    const result = slugify(longName);
    expect(result).toHaveLength(63);
    expect(result.endsWith('-')).toBe(false);
  });

  it('passes an already-valid slug through unchanged', () => {
    expect(slugify('already-valid-slug')).toBe('already-valid-slug');
  });
});
