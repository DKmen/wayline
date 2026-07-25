import { expect, test } from './extension-fixtures';

declare global {
  var __wayline_testHandleStartRecording:
    | ((
        url: string,
        tabId: number,
        executeScript: unknown,
        hasHostPermission: (pattern: string) => Promise<boolean>,
      ) => Promise<{ ok: boolean; reason?: string }>)
    | undefined;
}

test.describe('restricted-page failure state (WAYLI-31 acceptance)', () => {
  test('refuses to record a chrome:// page', { tag: '@smoke' }, async ({ serviceWorker }) => {
    const result = await serviceWorker.evaluate(async () => {
      const executeScript = async () => [];
      const hasHostPermission = async () => true;
      return globalThis.__wayline_testHandleStartRecording!(
        'chrome://extensions/',
        1,
        executeScript,
        hasHostPermission,
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
      const hasHostPermission = async () => true;
      const outcome = await globalThis.__wayline_testHandleStartRecording!(
        'http://localhost:4300/',
        1,
        executeScript,
        hasHostPermission,
      );
      return { outcome, calls };
    });

    expect(result.outcome).toEqual({ ok: true });
    expect(result.calls).toHaveLength(1);
  });
});
