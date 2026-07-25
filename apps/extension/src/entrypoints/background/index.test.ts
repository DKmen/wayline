import { afterEach, describe, expect, it, vi } from 'vitest';

const addListener = vi.fn();
const addListenerExternal = vi.fn();
const executeScript = vi.fn().mockResolvedValue([]);
const containsPermission = vi.fn();

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      onMessage: { addListener },
      onMessageExternal: { addListener: addListenerExternal },
    },
    scripting: { executeScript },
    permissions: { contains: containsPermission },
  },
}));

const {
  default: backgroundDefinition,
  handleStartRecording,
  isStartRecordingMessage,
  isPingMessage,
} = await import('./index');

const hasHostPermission = vi.fn();

afterEach(() => {
  vi.clearAllMocks();
});

describe('handleStartRecording', () => {
  it('injects the content script and reports ok when permission is granted', async () => {
    hasHostPermission.mockResolvedValue(true);

    const result = await handleStartRecording(
      'https://example.com/',
      7,
      executeScript,
      hasHostPermission,
    );

    expect(result).toEqual({ ok: true });
    expect(hasHostPermission).toHaveBeenCalledWith('https://example.com/*');
    expect(executeScript).toHaveBeenCalledWith({
      target: { tabId: 7 },
      files: ['content-scripts/content.js'],
    });
  });

  it('refuses a restricted page without injecting anything or checking permission', async () => {
    const result = await handleStartRecording(
      'chrome://extensions/',
      7,
      executeScript,
      hasHostPermission,
    );

    expect(result).toEqual({ ok: false, reason: 'unsupported-page' });
    expect(hasHostPermission).not.toHaveBeenCalled();
    expect(executeScript).not.toHaveBeenCalled();
  });

  it('blocks a normal page whose host permission has not been granted', async () => {
    hasHostPermission.mockResolvedValue(false);

    const result = await handleStartRecording(
      'https://example.com/',
      7,
      executeScript,
      hasHostPermission,
    );

    expect(result).toEqual({ ok: false, reason: 'permission-missing' });
    expect(executeScript).not.toHaveBeenCalled();
  });

  it('blocks a page whose URL cannot be turned into a host permission pattern', async () => {
    const result = await handleStartRecording(
      'file:///Users/x/notes.html',
      7,
      executeScript,
      hasHostPermission,
    );

    expect(result).toEqual({ ok: false, reason: 'unsupported-page' });
    expect(hasHostPermission).not.toHaveBeenCalled();
    expect(executeScript).not.toHaveBeenCalled();
  });
});

describe('isStartRecordingMessage', () => {
  it('accepts a well-formed start-recording message', () => {
    expect(
      isStartRecordingMessage({ type: 'start-recording', tabId: 1, url: 'https://example.com/' }),
    ).toBe(true);
  });

  it('rejects malformed or unrelated messages', () => {
    expect(isStartRecordingMessage(null)).toBe(false);
    expect(isStartRecordingMessage('start-recording')).toBe(false);
    expect(isStartRecordingMessage({ type: 'something-else' })).toBe(false);
    expect(
      isStartRecordingMessage({ type: 'start-recording', tabId: '1', url: 'https://example.com/' }),
    ).toBe(false);
    expect(isStartRecordingMessage({ type: 'start-recording', tabId: 1 })).toBe(false);
  });
});

describe('isPingMessage', () => {
  it('accepts a well-formed ping message', () => {
    expect(isPingMessage({ type: 'ping' })).toBe(true);
  });

  it('rejects malformed or unrelated messages', () => {
    expect(isPingMessage(null)).toBe(false);
    expect(isPingMessage('ping')).toBe(false);
    expect(isPingMessage({ type: 'something-else' })).toBe(false);
  });
});

describe('background main()', () => {
  it('registers a message listener that forwards a valid start-recording message and checks permission', async () => {
    containsPermission.mockResolvedValue(true);
    backgroundDefinition.main();
    const listener = addListener.mock.calls[0]![0] as (
      message: unknown,
    ) => Promise<unknown> | undefined;

    const result = await listener({
      type: 'start-recording',
      tabId: 3,
      url: 'https://example.com/',
    });

    expect(result).toEqual({ ok: true });
    expect(containsPermission).toHaveBeenCalledWith({ origins: ['https://example.com/*'] });
    expect(executeScript).toHaveBeenCalledWith({
      target: { tabId: 3 },
      files: ['content-scripts/content.js'],
    });
  });

  it('ignores an unrelated message instead of forwarding it', async () => {
    backgroundDefinition.main();
    const listener = addListener.mock.calls[0]![0] as (
      message: unknown,
    ) => Promise<unknown> | undefined;

    const result = await listener({ type: 'something-else' });

    expect(result).toBeUndefined();
    expect(executeScript).not.toHaveBeenCalled();
  });

  it('exposes the dev-only test hook used by the Playwright suite', () => {
    backgroundDefinition.main();

    expect(
      (globalThis as { __wayline_testHandleStartRecording?: unknown })
        .__wayline_testHandleStartRecording,
    ).toBe(handleStartRecording);
  });

  it('registers an external message listener that responds to a ping', async () => {
    backgroundDefinition.main();
    const listener = addListenerExternal.mock.calls[0]![0] as (
      message: unknown,
    ) => Promise<unknown> | undefined;

    const result = await listener({ type: 'ping' });

    expect(result).toEqual({ installed: true });
  });

  it('ignores an unrelated external message', async () => {
    backgroundDefinition.main();
    const listener = addListenerExternal.mock.calls[0]![0] as (
      message: unknown,
    ) => Promise<unknown> | undefined;

    const result = await listener({ type: 'something-else' });

    expect(result).toBeUndefined();
  });
});
