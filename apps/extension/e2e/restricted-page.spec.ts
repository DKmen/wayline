import { expect, test } from './extension-fixtures';

declare global {
  var __wayline_testHandleStartRecording:
    | ((
        url: string,
        tabId: number,
        executeScript: unknown,
      ) => Promise<{ ok: boolean; reason?: string }>)
    | undefined;
}

test.describe('restricted-page failure state (WAYLI-31 acceptance)', () => {
  test('refuses to record a chrome:// page', { tag: '@smoke' }, async ({ serviceWorker }) => {
    const result = await serviceWorker.evaluate(async () => {
      const executeScript = async () => [];
      return globalThis.__wayline_testHandleStartRecording!(
        'chrome://extensions/',
        1,
        executeScript,
      );
    });

    expect(result).toEqual({ ok: false, reason: 'unsupported-page' });
  });

  test('accepts a normal page', { tag: '@smoke' }, async ({ serviceWorker }) => {
    const result = await serviceWorker.evaluate(async () => {
      const calls: unknown[] = [];
      const executeScript = async (...args: unknown[]) => {
        calls.push(args);
        return [];
      };
      const outcome = await globalThis.__wayline_testHandleStartRecording!(
        'http://localhost:4300/',
        1,
        executeScript,
      );
      return { outcome, calls };
    });

    expect(result.outcome).toEqual({ ok: true });
    expect(result.calls).toHaveLength(1);
  });
});
