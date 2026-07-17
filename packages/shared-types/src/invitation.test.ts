import { describe, expect, it } from 'vitest';
import { invitationSchema } from './index';

describe('invitationSchema', () => {
  const valid = {
    id: '018f4f9e-7a3b-7c4d-9e1f-2a3b4c5d6e7f',
    workspaceId: '018f4f9e-7a3b-7c4d-9e1f-2a3b4c5d6e80',
    email: 'invitee@example.com',
    role: 'creator',
    invitedBy: 'ba_user_1',
    expiresAt: '2026-07-21T00:00:00.000Z',
    acceptedAt: null,
    revokedAt: null,
  };

  it('accepts a pending invitation and an accepted one', () => {
    expect(invitationSchema.parse(valid)).toEqual(valid);
    const accepted = { ...valid, acceptedAt: '2026-07-15T12:00:00.000Z' };
    expect(invitationSchema.parse(accepted)).toEqual(accepted);
  });

  it('accepts a null invitedBy (inviter account was deleted)', () => {
    const orphaned = { ...valid, invitedBy: null };
    expect(invitationSchema.parse(orphaned)).toEqual(orphaned);
  });

  it('rejects bad email, non-datetime expiry, and unknown keys', () => {
    expect(() => invitationSchema.parse({ ...valid, email: 'nope' })).toThrowError();
    expect(() => invitationSchema.parse({ ...valid, expiresAt: 'tomorrow' })).toThrowError();
    expect(() => invitationSchema.parse({ ...valid, tokenHash: 'x' })).toThrowError();
  });
});
