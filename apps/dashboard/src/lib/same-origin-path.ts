/** True for a same-origin relative path only — a single leading slash, never "//" or "scheme://". */
export function isSameOriginPath(value: string): boolean {
  return /^\/(?!\/)/.test(value);
}
