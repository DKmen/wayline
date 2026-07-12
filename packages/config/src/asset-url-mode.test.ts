import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { assetUrlModeSchema, createEnv } from './index';

describe('assetUrlModeSchema', () => {
  it('accepts both documented asset URL delivery modes', () => {
    expect(assetUrlModeSchema.parse('presign')).toBe('presign');
    expect(assetUrlModeSchema.parse('cloudfront')).toBe('cloudfront');
  });

  it('rejects an asset URL mode outside the documented set', () => {
    expect(() => assetUrlModeSchema.parse('public')).toThrowError();
  });

  it('fails fast through createEnv with a descriptive error when ASSET_URL_MODE is invalid', () => {
    expect(() =>
      createEnv(z.object({ ASSET_URL_MODE: assetUrlModeSchema }), { ASSET_URL_MODE: 'bogus' }),
    ).toThrowError(/ASSET_URL_MODE/);
  });
});
