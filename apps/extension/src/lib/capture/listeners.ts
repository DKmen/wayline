import type { ActionCandidateMessage, ActionKind } from './messages';
import { buildTargetSnapshot } from './metadata';
import { generateInstruction } from './instruction';
import { isSensitiveField } from './sensitive-field';
import { isDeclickWithinWindow, isInsideWaylineOverlay, type LastClick } from './noise-filter';

type SendMessage = (message: ActionCandidateMessage) => void;

/** The real event target, shadow-DOM aware — the first entry of the composed path. */
function resolveTarget(event: Event): Element | null {
  const [first] = event.composedPath();
  return first instanceof Element ? first : null;
}

function buildCandidate(
  action: ActionKind,
  targetEl: Element,
  now: () => number,
): ActionCandidateMessage {
  const target = buildTargetSnapshot(targetEl);
  return {
    type: 'action-candidate',
    action,
    target,
    url: location.href,
    pageTitle: document.title,
    viewport: { w: window.innerWidth, h: window.innerHeight },
    instruction: generateInstruction(action, target),
    sensitiveFieldDetected: isSensitiveField(targetEl),
    timestamp: now(),
  };
}

/**
 * Registers capture-phase `document` listeners producing `ActionCandidateMessage`s for
 * click/change/select/submit/Enter-as-submit, applying noise filtering and never reading a
 * typed value (docs/06-extension-spec.md §3). Returns a teardown function.
 */
export function registerCaptureListeners(
  doc: Document,
  sendMessage: SendMessage,
  overlayRoot: Element,
  now: () => number = Date.now,
): () => void {
  let lastClick: LastClick | null = null;

  const onClick = (event: Event) => {
    const targetEl = resolveTarget(event);
    if (!targetEl || isInsideWaylineOverlay(targetEl, overlayRoot)) return;

    const timestamp = now();
    if (isDeclickWithinWindow(targetEl, timestamp, lastClick)) return;
    lastClick = { target: targetEl, timestamp };

    sendMessage(buildCandidate('click', targetEl, now));
  };

  const onChange = (event: Event) => {
    const targetEl = resolveTarget(event);
    if (!targetEl || isInsideWaylineOverlay(targetEl, overlayRoot)) return;

    const action: ActionKind = targetEl.tagName === 'SELECT' ? 'select' : 'input';
    sendMessage(buildCandidate(action, targetEl, now));
  };

  const onSubmit = (event: Event) => {
    const targetEl = resolveTarget(event);
    if (!targetEl || isInsideWaylineOverlay(targetEl, overlayRoot)) return;

    sendMessage(buildCandidate('submit', targetEl, now));
  };

  const onKeydown = (event: Event) => {
    if (!(event instanceof KeyboardEvent) || event.key !== 'Enter') return;

    const targetEl = resolveTarget(event);
    if (!targetEl || isInsideWaylineOverlay(targetEl, overlayRoot)) return;
    if (targetEl.tagName === 'TEXTAREA') return; // Enter inserts a newline, not a submit signal
    if (targetEl.closest('form')) return; // the form's own 'submit' event covers this — avoid double-firing

    sendMessage(buildCandidate('submit', targetEl, now));
  };

  doc.addEventListener('click', onClick, true);
  doc.addEventListener('change', onChange, true);
  doc.addEventListener('submit', onSubmit, true);
  doc.addEventListener('keydown', onKeydown, true);

  return () => {
    doc.removeEventListener('click', onClick, true);
    doc.removeEventListener('change', onChange, true);
    doc.removeEventListener('submit', onSubmit, true);
    doc.removeEventListener('keydown', onKeydown, true);
  };
}
