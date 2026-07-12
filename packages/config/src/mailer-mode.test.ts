import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { createEnv, mailerModeSchema } from './index';

describe('mailerModeSchema', () => {
  it('accepts both documented mailer modes', () => {
    expect(mailerModeSchema.parse('smtp')).toBe('smtp');
    expect(mailerModeSchema.parse('ses')).toBe('ses');
  });

  it('rejects a mailer mode outside the documented set', () => {
    expect(() => mailerModeSchema.parse('sendgrid')).toThrowError();
  });

  it('fails fast through createEnv with a descriptive error when MAILER is invalid', () => {
    expect(() =>
      createEnv(z.object({ MAILER: mailerModeSchema }), { MAILER: 'bogus' }),
    ).toThrowError(/MAILER/);
  });
});
