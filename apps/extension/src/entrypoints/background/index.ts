import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { hostPermissionPatternFor } from '../../utils/hostPermissionPattern';
import { isRestrictedUrl } from '../../utils/isRestrictedUrl';

export type StartRecordingResult =
  | { ok: true }
  | { ok: false; reason: 'unsupported-page' }
  | { ok: false; reason: 'permission-missing' };

type ExecuteScript = typeof browser.scripting.executeScript;
type HasHostPermission = (pattern: string) => Promise<boolean>;

/**
 * Decides whether the active tab can be recorded and, if so, injects the (runtime-registered,
 * not manifest-declared) content script — docs/06-extension-spec.md §1, §6. Takes
 * `executeScript` and `hasHostPermission` as parameters so this branching logic is testable
 * without a browser.
 */
export async function handleStartRecording(
  url: string,
  tabId: number,
  executeScript: ExecuteScript,
  hasHostPermission: HasHostPermission,
): Promise<StartRecordingResult> {
  if (isRestrictedUrl(url)) return { ok: false, reason: 'unsupported-page' };

  const pattern = hostPermissionPatternFor(url);
  if (!pattern) return { ok: false, reason: 'unsupported-page' };
  if (!(await hasHostPermission(pattern))) {
    return { ok: false, reason: 'permission-missing' };
  }

  await executeScript({ target: { tabId }, files: ['content-scripts/content.js'] });
  return { ok: true };
}

export type StartRecordingMessage = { type: 'start-recording'; tabId: number; url: string };

export function isStartRecordingMessage(message: unknown): message is StartRecordingMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as { type?: unknown }).type === 'start-recording' &&
    typeof (message as { tabId?: unknown }).tabId === 'number' &&
    typeof (message as { url?: unknown }).url === 'string'
  );
}

export default defineBackground(() => {
  // Sent from the popup (not a content script), so there's no `sender.tab` to read from —
  // the popup queries the active tab itself and passes tabId/url explicitly.
  browser.runtime.onMessage.addListener((message: unknown) => {
    if (!isStartRecordingMessage(message)) return;

    return handleStartRecording(
      message.url,
      message.tabId,
      browser.scripting.executeScript,
      (pattern) => browser.permissions.contains({ origins: [pattern] }),
    );
  });

  // Exposed unconditionally for the Playwright build/load + restricted-page e2e suite
  // (apps/extension/e2e) — this is a pre-launch scaffold, not yet CWS-published, so there's
  // no hardening reason to gate this behind a dev-only build mode yet (revisit in S12).
  Object.assign(globalThis, { __wayline_testHandleStartRecording: handleStartRecording });
});
