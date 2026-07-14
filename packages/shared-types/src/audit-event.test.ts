import { describe, expect, it } from 'vitest';
import { auditActionSchema, auditEventSchema } from './index';

describe('auditActionSchema', () => {
  it('accepts every documented audit action', () => {
    for (const action of [
      'workspace.created',
      'member.added',
      'member.role_changed',
      'member.removed',
      'invitation.created',
      'invitation.accepted',
      'invitation.revoked',
    ]) {
      expect(auditActionSchema.parse(action)).toBe(action);
    }
  });

  it('rejects an undocumented action', () => {
    expect(() => auditActionSchema.parse('workspace.deleted')).toThrowError();
  });
});

describe('auditEventSchema', () => {
  const valid = {
    workspaceId: '018f4f9e-7a3b-7c4d-9e1f-2a3b4c5d6e7f',
    actorId: 'ba_user_1',
    action: 'member.added',
    targetType: 'member',
    targetId: 'ba_user_2',
    meta: { role: 'viewer' },
  };

  it('accepts an event, including a null actor (deleted account)', () => {
    expect(auditEventSchema.parse(valid)).toEqual(valid);
    expect(auditEventSchema.parse({ ...valid, actorId: null, targetId: null })).toEqual({
      ...valid,
      actorId: null,
      targetId: null,
    });
  });

  it('rejects empty targetType, unknown action, and unknown keys', () => {
    expect(() => auditEventSchema.parse({ ...valid, targetType: '' })).toThrowError();
    expect(() => auditEventSchema.parse({ ...valid, action: 'login' })).toThrowError();
    expect(() => auditEventSchema.parse({ ...valid, createdAt: 'now' })).toThrowError();
  });
});
