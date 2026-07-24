import { describe, expect, it } from 'vitest';
import { flowListResponseSchema, flowSchema, flowStatusSchema } from './index';

const valid = {
  id: '018f4f9e-7a3b-7c4d-9e1f-2a3b4c5d6e7f',
  workspaceId: '018f4f9e-7a3b-7c4d-9e1f-2a3b4c5d6e80',
  createdBy: 'user_1',
  title: 'Reset your password',
  status: 'draft_local',
  currentVersionId: null,
};

describe('flowSchema', () => {
  it('accepts a flow for every documented status', () => {
    for (const status of flowStatusSchema.options) {
      expect(flowSchema.parse({ ...valid, status })).toEqual({ ...valid, status });
    }
  });

  it('accepts a published flow with a current version id', () => {
    const published = { ...valid, status: 'published', currentVersionId: valid.workspaceId };

    expect(flowSchema.parse(published)).toEqual(published);
  });

  it('rejects an empty title, unknown status, and unknown keys', () => {
    expect(() => flowSchema.parse({ ...valid, title: '' })).toThrowError();
    expect(() => flowSchema.parse({ ...valid, status: 'deleted' })).toThrowError();
    expect(() => flowSchema.parse({ ...valid, extra: true })).toThrowError();
  });
});

describe('flowListResponseSchema', () => {
  it('accepts an empty and a populated flow list', () => {
    expect(flowListResponseSchema.parse({ flows: [] })).toEqual({ flows: [] });
    expect(flowListResponseSchema.parse({ flows: [valid] })).toEqual({ flows: [valid] });
  });

  it('rejects a missing flows key', () => {
    expect(() => flowListResponseSchema.parse({})).toThrowError();
  });
});
