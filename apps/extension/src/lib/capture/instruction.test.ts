import { describe, expect, it } from 'vitest';
import type { ActionTargetSnapshot } from './messages';
import { generateInstruction } from './instruction';

const bbox = { x: 0, y: 0, w: 0, h: 0, vw: 1440, vh: 900 };

function target(overrides: Partial<ActionTargetSnapshot>): ActionTargetSnapshot {
  return {
    tagName: 'div',
    role: null,
    accessibleName: null,
    fieldType: null,
    fieldName: null,
    bbox,
    ...overrides,
  };
}

describe('generateInstruction', () => {
  it('click: uses the accessible name when present', () => {
    expect(generateInstruction('click', target({ accessibleName: 'Submit' }))).toBe(
      "Click 'Submit'",
    );
  });

  it('click: falls back to the role when there is no accessible name', () => {
    expect(generateInstruction('click', target({ role: 'button' }))).toBe('Click the button');
  });

  it('click: falls back to the tag name when there is no name or role', () => {
    expect(generateInstruction('click', target({ tagName: 'div' }))).toBe('Click the div');
  });

  it('input: uses a fixed phrase for password fields, ignoring accessible name', () => {
    expect(
      generateInstruction('input', target({ fieldType: 'password', accessibleName: 'Password' })),
    ).toBe('Enter your password');
  });

  it('input: uses a generic email phrase when there is no accessible name', () => {
    expect(generateInstruction('input', target({ fieldType: 'email' }))).toBe('Enter your email');
  });

  it('input: uses the accessible name, lowercased, when present', () => {
    expect(generateInstruction('input', target({ accessibleName: 'Work Email' }))).toBe(
      'Enter work email',
    );
  });

  it('input: falls back to the field name when there is no accessible name', () => {
    expect(generateInstruction('input', target({ fieldName: 'fullName' }))).toBe(
      'Enter a value in fullName',
    );
  });

  it('input: falls back to a generic phrase when no metadata exists at all', () => {
    expect(generateInstruction('input', target({}))).toBe('Enter a value');
  });

  it('select: uses the accessible name, lowercased', () => {
    expect(generateInstruction('select', target({ accessibleName: 'Country' }))).toBe(
      'Select a country',
    );
  });

  it('select: falls back to a generic phrase', () => {
    expect(generateInstruction('select', target({}))).toBe('Make a selection');
  });

  it('submit: uses the accessible name when present', () => {
    expect(generateInstruction('submit', target({ accessibleName: 'Sign up' }))).toBe(
      "Submit 'Sign up'",
    );
  });

  it('submit: falls back to a generic phrase', () => {
    expect(generateInstruction('submit', target({}))).toBe('Submit the form');
  });

  it('navigate: always returns the fixed phrase', () => {
    expect(generateInstruction('navigate', target({}))).toBe('Continue to the next page');
  });
});
