import type { ActionKind, ActionTargetSnapshot } from './messages';

/** "Click 'X'" using the accessible name, else the role, else the tag name. */
function clickInstruction(target: ActionTargetSnapshot): string {
  if (target.accessibleName) return `Click '${target.accessibleName}'`;
  if (target.role) return `Click the ${target.role}`;
  return `Click the ${target.tagName}`;
}

/** "Enter ..." — password fields get a fixed phrase regardless of their accessible name. */
function inputInstruction(target: ActionTargetSnapshot): string {
  if (target.fieldType === 'password') return 'Enter your password';
  if (target.accessibleName) return `Enter ${target.accessibleName.toLowerCase()}`;
  if (target.fieldType === 'email') return 'Enter your email';
  if (target.fieldName) return `Enter a value in ${target.fieldName}`;
  return 'Enter a value';
}

/** "Select a ..." using the accessible name, else a generic phrase. */
function selectInstruction(target: ActionTargetSnapshot): string {
  if (target.accessibleName) return `Select a ${target.accessibleName.toLowerCase()}`;
  return 'Make a selection';
}

/** "Submit 'X'" using the accessible name, else a generic phrase. */
function submitInstruction(target: ActionTargetSnapshot): string {
  if (target.accessibleName) return `Submit '${target.accessibleName}'`;
  return 'Submit the form';
}

/** Deterministic, template-based instruction string for one action + target snapshot — no model call. */
export function generateInstruction(action: ActionKind, target: ActionTargetSnapshot): string {
  switch (action) {
    case 'click':
      return clickInstruction(target);
    case 'input':
      return inputInstruction(target);
    case 'select':
      return selectInstruction(target);
    case 'submit':
      return submitInstruction(target);
    case 'navigate':
      return 'Continue to the next page';
  }
}
