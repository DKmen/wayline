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
