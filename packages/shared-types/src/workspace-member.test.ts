import { describe, expect, it } from 'vitest';
import {
  memberListItemSchema,
  memberListResponseSchema,
  myWorkspaceMembershipSchema,
  myWorkspacesResponseSchema,
  workspaceMemberSchema,
} from './index';

const workspaceId = '018f4f9e-7a3b-7c4d-9e1f-2a3b4c5d6e7f';

describe('workspaceMemberSchema', () => {
  const valid = { workspaceId, userId: 'ba_user_1', role: 'admin' };

  it('accepts a membership for every documented role', () => {
    for (const role of ['viewer', 'creator', 'admin']) {
      expect(workspaceMemberSchema.parse({ ...valid, role })).toEqual({ ...valid, role });
    }
  });

  it('rejects empty userId, unknown role, and unknown keys', () => {
    expect(() => workspaceMemberSchema.parse({ ...valid, userId: '' })).toThrowError();
    expect(() => workspaceMemberSchema.parse({ ...valid, role: 'owner' })).toThrowError();
    expect(() => workspaceMemberSchema.parse({ ...valid, extra: true })).toThrowError();
  });
});

describe('memberListResponseSchema', () => {
  const item = { userId: 'ba_user_1', name: 'Ada', email: 'ada@example.com', role: 'viewer' };

  it('accepts a list of members', () => {
    expect(memberListResponseSchema.parse({ members: [item] })).toEqual({ members: [item] });
    expect(memberListResponseSchema.parse({ members: [] })).toEqual({ members: [] });
  });

  it('rejects a malformed email and missing members key', () => {
    expect(() => memberListItemSchema.parse({ ...item, email: 'not-an-email' })).toThrowError();
    expect(() => memberListResponseSchema.parse({})).toThrowError();
  });
});

describe('myWorkspacesResponseSchema', () => {
  const workspace = { id: workspaceId, name: 'Acme', slug: 'acme', plan: 'free' };
  const membership = { workspace, role: 'admin' };

  it('accepts a list of workspace memberships', () => {
    expect(myWorkspaceMembershipSchema.parse(membership)).toEqual(membership);
    expect(myWorkspacesResponseSchema.parse({ workspaces: [membership] })).toEqual({
      workspaces: [membership],
    });
    expect(myWorkspacesResponseSchema.parse({ workspaces: [] })).toEqual({ workspaces: [] });
  });

  it('rejects an unknown role and a missing workspaces key', () => {
    expect(() =>
      myWorkspaceMembershipSchema.parse({ ...membership, role: 'owner' }),
    ).toThrowError();
    expect(() => myWorkspacesResponseSchema.parse({})).toThrowError();
  });
});
