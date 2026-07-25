/** Derives the minimal per-site host-permission match pattern for a URL — never `<all_urls>`. */
export function hostPermissionPatternFor(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

  return `${parsed.protocol}//${parsed.hostname}/*`;
}
