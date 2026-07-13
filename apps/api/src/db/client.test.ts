import { describe, expect, it } from 'vitest';
import { createDb } from './client';

describe('createDb', () => {
  it('returns a Drizzle instance without throwing given a well-formed connection string', () => {
    expect(() => createDb('postgres://wayline:wayline@localhost:5432/wayline')).not.toThrow();
  });

  it('throws on a malformed connection string', () => {
    expect(() => createDb('not-a-connection-string')).toThrow();
  });
});
