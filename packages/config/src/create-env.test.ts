import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createEnv } from './index';

const schema = z.object({
  PORT: z.coerce.number().int().positive(),
  DATABASE_URL: z.string().url(),
});

describe('createEnv', () => {
  it('returns a typed, parsed object when every required var is present and valid', () => {
    const env = createEnv(schema, {
      PORT: '3000',
      DATABASE_URL: 'postgres://localhost:5432/wayline',
    });

    expect(env).toEqual({ PORT: 3000, DATABASE_URL: 'postgres://localhost:5432/wayline' });
  });

  it('throws a descriptive error listing every missing/invalid var when validation fails', () => {
    expect(() =>
      createEnv(schema, {
        PORT: 'not-a-number',
        // DATABASE_URL intentionally omitted
      }),
    ).toThrowError(/PORT|DATABASE_URL/);
  });
});
