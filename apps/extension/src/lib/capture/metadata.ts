import type { ActionTargetSnapshot } from './messages';

const FIELD_TAGS = new Set(['INPUT', 'SELECT', 'TEXTAREA']);

const IMPLICIT_ROLES: Record<string, string> = {
  BUTTON: 'button',
  SELECT: 'listbox',
  TEXTAREA: 'textbox',
};

const INPUT_TYPE_ROLES: Record<string, string> = {
  button: 'button',
  submit: 'button',
  reset: 'button',
  checkbox: 'checkbox',
  radio: 'radio',
};

/**
 * Best-effort accessible name from aria-label, an aria-labelledby target's own aria-label,
 * or placeholder — deliberately never a label's rendered text (docs/09-security-privacy.md §2:
 * the value/textContent ban has no carve-out for `<label>`, since label copy isn't provably safe).
 */
export function getAccessibleName(el: Element): string | null {
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;

  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const referenced = el.ownerDocument.getElementById(labelledBy);
    const referencedLabel = referenced?.getAttribute('aria-label');
    if (referencedLabel) return referencedLabel;
  }

  const placeholder = el.getAttribute('placeholder');
  if (placeholder) return placeholder;

  return null;
}

/** Form-control input type, 'select', or 'textarea' — null for non-form elements. */
export function getFieldType(el: Element): string | null {
  if (el instanceof HTMLInputElement) return (el.getAttribute('type') ?? 'text').toLowerCase();
  if (el instanceof HTMLSelectElement) return 'select';
  if (el instanceof HTMLTextAreaElement) return 'textarea';
  return null;
}

/** The `name` attribute for a form control, else null. */
export function getFieldName(el: Element): string | null {
  if (!FIELD_TAGS.has(el.tagName)) return null;
  return el.getAttribute('name');
}

/** Explicit `role` attribute if present, else a small built-in tag/type→role fallback table. */
export function getImplicitRole(el: Element): string | null {
  const explicit = el.getAttribute('role');
  if (explicit) return explicit;

  if (el.tagName === 'A' && el.hasAttribute('href')) return 'link';

  if (el instanceof HTMLInputElement) {
    const type = (el.getAttribute('type') ?? 'text').toLowerCase();
    return INPUT_TYPE_ROLES[type] ?? 'textbox';
  }

  return IMPLICIT_ROLES[el.tagName] ?? null;
}

/** Viewport-relative bounding box plus the current viewport size. */
export function getElementBbox(el: Element): ActionTargetSnapshot['bbox'] {
  const rect = el.getBoundingClientRect();
  return {
    x: rect.x,
    y: rect.y,
    w: rect.width,
    h: rect.height,
    vw: window.innerWidth,
    vh: window.innerHeight,
  };
}

/** Assembles the full metadata-only snapshot for one capture target — never a typed value. */
export function buildTargetSnapshot(el: Element): ActionTargetSnapshot {
  return {
    tagName: el.tagName.toLowerCase(),
    role: getImplicitRole(el),
    accessibleName: getAccessibleName(el),
    fieldType: getFieldType(el),
    fieldName: getFieldName(el),
    bbox: getElementBbox(el),
  };
}
