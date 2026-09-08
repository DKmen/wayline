/** Repeated clicks on the same target inside this window are noise, not a new step (docs/06-extension-spec.md §3). */
export const NOISE_DECLICK_WINDOW_MS = 500;

export type LastClick = { target: Element; timestamp: number };

/**
 * True if `el` is inside Wayline's own overlay (the shadow-root UI content.ts mounts) and
 * should never generate a capture candidate.
 */
export function isInsideWaylineOverlay(el: Element, overlayRoot: Element): boolean {
  if (el === overlayRoot) return true;
  if (overlayRoot.contains(el)) return true;
  return overlayRoot.shadowRoot?.contains(el) ?? false;
}

/** True if this click on `target` is a repeat within NOISE_DECLICK_WINDOW_MS of `lastClick`. */
export function isDeclickWithinWindow(
  target: Element,
  timestamp: number,
  lastClick: LastClick | null,
): boolean {
  if (!lastClick) return false;
  return target === lastClick.target && timestamp - lastClick.timestamp < NOISE_DECLICK_WINDOW_MS;
}
