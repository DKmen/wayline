import { describe, expect, it } from 'vitest';
import { createWorkspaceRequestSchema, workspaceSchema, workspaceSlugSchema } from './index';

describe('workspaceSlugSchema', () => {
  it('accepts url-safe slugs within length bounds', () => {
    for (const slug of ['ab', 'acme', 'acme-inc', 'a1-b2-c3', 'a'.repeat(63)]) {
      expect(workspaceSlugSchema.parse(slug)).toBe(slug);
    }
  });

  it('rejects slugs with uppercase, edge hyphens, or bad length', () => {
    for (const slug of ['A', 'a', 'Acme', '-acme', 'acme-', 'ac me', 'a'.repeat(64), '']) {
      expect(() => workspaceSlugSchema.parse(slug)).toThrowError();
    }
  });
});

describe('workspaceSchema', () => {
  const valid = {
    id: '018f4f9e-7a3b-7c4d-9e1f-2a3b4c5d6e7f',
    name: 'Acme',
    slug: 'acme',
    plan: 'free',
  };

  it('accepts a complete workspace', () => {
    expect(workspaceSchema.parse(valid)).toEqual(valid);
  });

  it('rejects unknown keys, bad uuid, and unknown plan', () => {
    expect(() => workspaceSchema.parse({ ...valid, extra: 1 })).toThrowError();
    expect(() => workspaceSchema.parse({ ...valid, id: 'not-a-uuid' })).toThrowError();
    expect(() => workspaceSchema.parse({ ...valid, plan: 'enterprise' })).toThrowError();
  });
});

describe('createWorkspaceRequestSchema', () => {
  it('accepts a name and slug', () => {
    expect(createWorkspaceRequestSchema.parse({ name: 'Acme', slug: 'acme' })).toEqual({
      name: 'Acme',
      slug: 'acme',
    });
  });

  it('rejects empty name, overlong name, and unknown keys', () => {
    expect(() => createWorkspaceRequestSchema.parse({ name: '', slug: 'acme' })).toThrowError();
    expect(() =>
      createWorkspaceRequestSchema.parse({ name: 'a'.repeat(121), slug: 'acme' }),
    ).toThrowError();
    expect(() =>
      createWorkspaceRequestSchema.parse({ name: 'Acme', slug: 'acme', plan: 'pro' }),
    ).toThrowError();
  });
});
