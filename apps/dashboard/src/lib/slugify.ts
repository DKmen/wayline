/**
 * Derives a candidate workspace slug from a name, for the create-form's auto-fill only —
 * the server (workspaceSlugSchema + citext uniqueness) is the actual source of truth, so
 * this never needs to stay in lockstep with server validation beyond the length ceiling.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining diacritics left by NFKD (e.g. e + acute)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63)
    .replace(/-+$/, ''); // a slice() cut can land mid-hyphen-run; trim the trailing remainder
}
