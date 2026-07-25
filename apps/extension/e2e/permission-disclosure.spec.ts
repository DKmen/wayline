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

test.describe('per-site permission disclosure (WAYLI-32 acceptance)', () => {
  test(
    'blocks capture on a normal page until the host permission is granted',
    { tag: '@smoke' },
    async ({ serviceWorker }) => {
      const result = await serviceWorker.evaluate(async () => {
        const executeScript = async () => [];
        const hasHostPermission = async () => false;
        return globalThis.__wayline_testHandleStartRecording!(
          'https://example.com/',
          1,
          executeScript,
          hasHostPermission,
        );
      });

      expect(result).toEqual({ ok: false, reason: 'permission-missing' });
    },
  );

  test(
    'proceeds and injects once the host permission has been granted',
    { tag: '@smoke' },
    async ({ serviceWorker }) => {
      const result = await serviceWorker.evaluate(async () => {
        const calls: unknown[] = [];
        const executeScript = async (...args: unknown[]) => {
          calls.push(args);
          return [];
        };
        const hasHostPermission = async () => true;
        const outcome = await globalThis.__wayline_testHandleStartRecording!(
          'https://example.com/',
          1,
          executeScript,
          hasHostPermission,
        );
        return { outcome, calls };
      });

      expect(result.outcome).toEqual({ ok: true });
      expect(result.calls).toHaveLength(1);
    },
  );
});
