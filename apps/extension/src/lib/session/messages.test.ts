import { describe, expect, it } from 'vitest';
import { isSessionEndedMessage, isSessionReadyMessage } from './messages';

describe('isSessionReadyMessage', () => {
  it('accepts a well-formed session-ready message', () => {
    expect(isSessionReadyMessage({ type: 'session-ready' })).toBe(true);
  });

  it('rejects malformed or unrelated messages', () => {
    expect(isSessionReadyMessage(null)).toBe(false);
    expect(isSessionReadyMessage('session-ready')).toBe(false);
    expect(isSessionReadyMessage({ type: 'session-ended' })).toBe(false);
  });
});

describe('isSessionEndedMessage', () => {
  it('accepts a well-formed session-ended message', () => {
    expect(isSessionEndedMessage({ type: 'session-ended' })).toBe(true);
  });

  it('rejects malformed or unrelated messages', () => {
    expect(isSessionEndedMessage(null)).toBe(false);
    expect(isSessionEndedMessage('session-ended')).toBe(false);
    expect(isSessionEndedMessage({ type: 'session-ready' })).toBe(false);
  });
});
