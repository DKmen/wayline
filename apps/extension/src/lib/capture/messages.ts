export type ActionKind = 'click' | 'input' | 'select' | 'submit' | 'navigate';

export type ActionTargetSnapshot = {
  tagName: string;
  role: string | null;
  accessibleName: string | null;
  fieldType: string | null;
  fieldName: string | null;
  bbox: { x: number; y: number; w: number; h: number; vw: number; vh: number };
};

export type ActionCandidateMessage = {
  type: 'action-candidate';
  action: ActionKind;
  target: ActionTargetSnapshot;
  url: string;
  pageTitle: string;
  viewport: { w: number; h: number };
  instruction: string;
  sensitiveFieldDetected: boolean;
  timestamp: number;
};

const ACTION_KINDS = new Set<ActionKind>(['click', 'input', 'select', 'submit', 'navigate']);

const CANDIDATE_KEYS = new Set([
  'type',
  'action',
  'target',
  'url',
  'pageTitle',
  'viewport',
  'instruction',
  'sensitiveFieldDetected',
  'timestamp',
]);

const TARGET_KEYS = new Set([
  'tagName',
  'role',
  'accessibleName',
  'fieldType',
  'fieldName',
  'bbox',
]);

const BBOX_KEYS = new Set(['x', 'y', 'w', 'h', 'vw', 'vh']);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: Set<string>): boolean {
  return Object.keys(value).every((key) => allowed.has(key));
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isBbox(value: unknown): value is ActionTargetSnapshot['bbox'] {
  return (
    isPlainObject(value) &&
    hasOnlyKeys(value, BBOX_KEYS) &&
    ['x', 'y', 'w', 'h', 'vw', 'vh'].every((key) => typeof value[key] === 'number')
  );
}

function isTargetSnapshot(value: unknown): value is ActionTargetSnapshot {
  return (
    isPlainObject(value) &&
    hasOnlyKeys(value, TARGET_KEYS) &&
    typeof value.tagName === 'string' &&
    isNullableString(value.role) &&
    isNullableString(value.accessibleName) &&
    isNullableString(value.fieldType) &&
    isNullableString(value.fieldName) &&
    isBbox(value.bbox)
  );
}

function isViewport(value: unknown): value is ActionCandidateMessage['viewport'] {
  return (
    isPlainObject(value) &&
    hasOnlyKeys(value, new Set(['w', 'h'])) &&
    typeof value.w === 'number' &&
    typeof value.h === 'number'
  );
}

/**
 * True if `message` is a well-formed `action-candidate` — checked strictly (no unrecognized
 * top-level or target field) so a leaked typed value can never pass silently as an extra key.
 */
export function isActionCandidateMessage(message: unknown): message is ActionCandidateMessage {
  if (!isPlainObject(message)) return false;
  if (!hasOnlyKeys(message, CANDIDATE_KEYS)) return false;

  return (
    message.type === 'action-candidate' &&
    typeof message.action === 'string' &&
    ACTION_KINDS.has(message.action as ActionKind) &&
    isTargetSnapshot(message.target) &&
    typeof message.url === 'string' &&
    typeof message.pageTitle === 'string' &&
    isViewport(message.viewport) &&
    typeof message.instruction === 'string' &&
    typeof message.sensitiveFieldDetected === 'boolean' &&
    typeof message.timestamp === 'number'
  );
}
