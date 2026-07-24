const RESTRICTED_SCHEMES = /^(chrome|chrome-extension|edge|about):/i;
const CHROME_WEB_STORE =
  /^https:\/\/(chromewebstore\.google\.com|chrome\.google\.com\/webstore)\//i;

/** True if `url` is a browser-internal, extension, or Chrome Web Store page Wayline cannot capture or walk through (docs/06-extension-spec.md §1, §6). */
export function isRestrictedUrl(url: string): boolean {
  return RESTRICTED_SCHEMES.test(url) || CHROME_WEB_STORE.test(url);
}
