type ChromeRuntime = {
  sendMessage?: (
    extensionId: string,
    message: unknown,
    callback: (response: unknown) => void,
  ) => void;
  lastError?: { message: string };
};

/** Probes whether the Wayline extension is installed via its external-message ping — resolves false alike for "not installed" and "unreachable/blocked". */
export async function checkExtensionInstalled(extensionId: string): Promise<boolean> {
  const runtime = (globalThis as { chrome?: { runtime?: ChromeRuntime } }).chrome?.runtime;
  if (!extensionId || !runtime?.sendMessage) return false;

  return new Promise((resolve) => {
    try {
      runtime.sendMessage!(extensionId, { type: 'ping' }, (response) => {
        if (runtime.lastError) {
          resolve(false);
          return;
        }
        resolve((response as { installed?: boolean } | undefined)?.installed === true);
      });
    } catch {
      resolve(false);
    }
  });
}

function sendPing(extensionId: string, message: { type: 'session-ready' | 'session-ended' }): void {
  const runtime = (globalThis as { chrome?: { runtime?: ChromeRuntime } }).chrome?.runtime;
  if (!extensionId || !runtime?.sendMessage) return;

  try {
    // Fire-and-forget: the dashboard doesn't act on the extension's response, and an
    // absent/unreachable extension is a normal, silent no-op, not an error.
    runtime.sendMessage(extensionId, message, () => {
      void runtime.lastError; // read to prevent an "unchecked runtime.lastError" console warning
    });
  } catch {
    // Malformed extension ID or similar synchronous throw — nothing to recover, ignore.
  }
}

/** Tells the extension a session now exists, so it can fetch and cache identity (WAYLI-34). */
export function sendSessionReadyPing(extensionId: string): void {
  sendPing(extensionId, { type: 'session-ready' });
}

/** Tells the extension sign-out just happened, so it can clear its cached identity. */
export function sendSessionEndedPing(extensionId: string): void {
  sendPing(extensionId, { type: 'session-ended' });
}
