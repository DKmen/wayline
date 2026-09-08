const SENSITIVE_AUTOCOMPLETE_PREFIXES = ['cc-'];

const SENSITIVE_NAME_PATTERN = /ssn|social.?security|card.?number|cvv|cvc/i;

/**
 * True if type/name/id/autocomplete heuristics suggest this field holds a secret
 * (password, card, SSN-like) — surfaced for the redaction-review flow (docs/09-security-privacy.md §2).
 */
export function isSensitiveField(el: Element): boolean {
  if (!(el instanceof HTMLInputElement)) return false;

  if (el.getAttribute('type')?.toLowerCase() === 'password') return true;

  const autocomplete = el.getAttribute('autocomplete')?.toLowerCase() ?? '';
  if (SENSITIVE_AUTOCOMPLETE_PREFIXES.some((prefix) => autocomplete.startsWith(prefix))) {
    return true;
  }

  const name = el.getAttribute('name') ?? '';
  const id = el.getAttribute('id') ?? '';
  return SENSITIVE_NAME_PATTERN.test(name) || SENSITIVE_NAME_PATTERN.test(id);
}
