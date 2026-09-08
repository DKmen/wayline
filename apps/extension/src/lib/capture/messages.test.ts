import { describe, expect, it } from 'vitest';
import { isActionCandidateMessage } from './messages';

const validCandidate = {
  type: 'action-candidate',
  action: 'click',
  target: {
    tagName: 'button',
    role: 'button',
    accessibleName: 'Submit',
    fieldType: null,
    fieldName: null,
    bbox: { x: 10, y: 20, w: 100, h: 40, vw: 1440, vh: 900 },
  },
  url: 'https://fixture.wayline.app/forms',
  pageTitle: 'Forms',
  viewport: { w: 1440, h: 900 },
  instruction: "Click 'Submit'",
  sensitiveFieldDetected: false,
  timestamp: 1_700_000_000_000,
};

describe('isActionCandidateMessage', () => {
  it('accepts a well-formed action-candidate message', () => {
    expect(isActionCandidateMessage(validCandidate)).toBe(true);
  });

  it('rejects malformed or unrelated messages', () => {
    expect(isActionCandidateMessage(null)).toBe(false);
    expect(isActionCandidateMessage(undefined)).toBe(false);
    expect(isActionCandidateMessage('action-candidate')).toBe(false);
    expect(isActionCandidateMessage({ type: 'start-recording' })).toBe(false);
    expect(isActionCandidateMessage({ ...validCandidate, target: undefined })).toBe(false);
  });

  it('rejects a candidate carrying an unrecognized field, e.g. a leaked typed input value', () => {
    expect(isActionCandidateMessage({ ...validCandidate, value: 'user@example.com' })).toBe(false);
  });
});
