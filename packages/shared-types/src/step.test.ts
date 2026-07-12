import { describe, expect, it } from 'vitest';
import { stepActionSchema, stepSchema } from './index';

const validStep = {
  id: '4b6f3a7e-1a2b-4c3d-8e9f-0a1b2c3d4e5f',
  flowVersionId: '4b6f3a7e-1a2b-4c3d-8e9f-0a1b2c3d4e60',
  order: 0,
  instruction: 'Click Import contacts in the toolbar',
  action: 'click',
  url: 'https://app.crm.example/contacts',
  pageTitle: 'Contacts',
  viewportW: 1440,
  viewportH: 900,
  screenshotAssetId: '4b6f3a7e-1a2b-4c3d-8e9f-0a1b2c3d4e61',
  targetBounds: { x: 10, y: 20, w: 100, h: 40 },
  targetDescriptor: { bbox: { x: 10, y: 20, w: 100, h: 40, vw: 1440, vh: 900 } },
  redactionStatus: 'clear',
};

describe('stepActionSchema', () => {
  it('accepts every documented action kind', () => {
    for (const action of ['click', 'input', 'select', 'submit', 'navigate', 'manual']) {
      expect(stepActionSchema.parse(action)).toBe(action);
    }
  });

  it('rejects an action kind that is not part of the documented set', () => {
    expect(() => stepActionSchema.parse('drag')).toThrowError();
  });
});

describe('stepSchema', () => {
  it('parses a fully-populated, valid step', () => {
    expect(stepSchema.parse(validStep)).toEqual(validStep);
  });

  it('rejects a step missing a required field', () => {
    const { instruction: _instruction, ...missingInstruction } = validStep;
    expect(() => stepSchema.parse(missingInstruction)).toThrowError();
  });

  it('rejects redactionStatus "warning" — a warning must never reach the server', () => {
    expect(() => stepSchema.parse({ ...validStep, redactionStatus: 'warning' })).toThrowError();
  });

  it('rejects a step carrying an unrecognized field, e.g. a leaked typed input value', () => {
    expect(() => stepSchema.parse({ ...validStep, value: 'user@example.com' })).toThrowError();
  });
});
