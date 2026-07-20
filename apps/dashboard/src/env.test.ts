import { createEnv } from '@wayline/config';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

// Re-derive the same schema shape as env.ts rather than importing the module (which
// reads import.meta.env at import time) — this test exercises createEnv's behavior
// against controlled inputs instead of the ambient Vite env.
const schema = z.object({ VITE_API_URL: z.string().default('') });

describe('dashboard env schema', () => {
  it('defaults VITE_API_URL to empty (same-origin/proxied) when unset', () => {
    expect(createEnv(schema, {})).toEqual({ VITE_API_URL: '' });
  });

  it('accepts an explicit cross-origin API URL', () => {
    expect(createEnv(schema, { VITE_API_URL: 'https://api.wayline.app' })).toEqual({
      VITE_API_URL: 'https://api.wayline.app',
    });
  });

  it('throws with every invalid key listed when a var has the wrong type', () => {
    const badSchema = z.object({ VITE_API_URL: z.number() });
    expect(() => createEnv(badSchema, { VITE_API_URL: 'not-a-number' })).toThrowError(
      /VITE_API_URL/,
    );
  });
});
