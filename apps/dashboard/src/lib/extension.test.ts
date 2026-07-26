import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkExtensionInstalled, sendSessionEndedPing, sendSessionReadyPing } from './extension';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('checkExtensionInstalled', () => {
  it('resolves true when the extension responds to the ping', async () => {
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: (_id: string, _message: unknown, callback: (response: unknown) => void) =>
          callback({ installed: true }),
      },
    });

    await expect(checkExtensionInstalled('abc')).resolves.toBe(true);
  });

  it('resolves false when chrome is not present in the page at all', async () => {
    await expect(checkExtensionInstalled('abc')).resolves.toBe(false);
  });

  it('resolves false when the extension is unreachable (lastError set)', async () => {
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: (_id: string, _message: unknown, callback: (response: unknown) => void) =>
          callback(undefined),
        lastError: { message: 'Could not establish connection. Receiving end does not exist.' },
      },
    });

    await expect(checkExtensionInstalled('abc')).resolves.toBe(false);
  });

  it('resolves false when the extension ID is empty', async () => {
    vi.stubGlobal('chrome', { runtime: { sendMessage: vi.fn() } });

    await expect(checkExtensionInstalled('')).resolves.toBe(false);
  });

  it('resolves false when sendMessage throws synchronously (malformed extension ID)', async () => {
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: () => {
          throw new TypeError('Invalid extension id');
        },
      },
    });

    await expect(checkExtensionInstalled('not-a-valid-id')).resolves.toBe(false);
  });
});

describe('sendSessionReadyPing', () => {
  it('sends a session-ready message when an extension ID is configured', () => {
    const sendMessage = vi.fn();
    vi.stubGlobal('chrome', { runtime: { sendMessage } });

    sendSessionReadyPing('abc');

    expect(sendMessage).toHaveBeenCalledWith(
      'abc',
      { type: 'session-ready' },
      expect.any(Function),
    );
  });

  it('does nothing when chrome.runtime is unavailable (extension not installed)', () => {
    expect(() => sendSessionReadyPing('abc')).not.toThrow();
  });

  it('does nothing when the extension ID is empty', () => {
    const sendMessage = vi.fn();
    vi.stubGlobal('chrome', { runtime: { sendMessage } });

    sendSessionReadyPing('');

    expect(sendMessage).not.toHaveBeenCalled();
  });
});

describe('sendSessionEndedPing', () => {
  it('sends a session-ended message when an extension ID is configured', () => {
    const sendMessage = vi.fn();
    vi.stubGlobal('chrome', { runtime: { sendMessage } });

    sendSessionEndedPing('abc');

    expect(sendMessage).toHaveBeenCalledWith(
      'abc',
      { type: 'session-ended' },
      expect.any(Function),
    );
  });

  it('does not throw when sendMessage itself throws synchronously', () => {
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: () => {
          throw new TypeError('Invalid extension id');
        },
      },
    });

    expect(() => sendSessionEndedPing('abc')).not.toThrow();
  });
});
