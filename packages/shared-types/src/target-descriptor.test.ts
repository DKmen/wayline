import { describe, expect, it } from 'vitest';
import { targetDescriptorSchema } from './index';

const minimalDescriptor = {
  bbox: { x: 10, y: 20, w: 100, h: 40, vw: 1440, vh: 900 },
};

describe('targetDescriptorSchema', () => {
  it('parses a descriptor with only the required bbox present', () => {
    expect(targetDescriptorSchema.parse(minimalDescriptor)).toEqual(minimalDescriptor);
  });

  it('parses a fully-populated descriptor with every optional signal', () => {
    const full = {
      testId: 'import-contacts-button',
      domId: 'import-btn',
      role: { role: 'button', name: 'Import contacts' },
      label: 'Import contacts',
      text: { content: 'Import contacts', tag: 'button' },
      css: '#import-btn',
      pierce: 'my-app::shadow #import-btn',
      nth: 0,
      bbox: minimalDescriptor.bbox,
    };
    expect(targetDescriptorSchema.parse(full)).toEqual(full);
  });

  it('rejects a descriptor missing the required bbox', () => {
    expect(() => targetDescriptorSchema.parse({ testId: 'x' })).toThrowError();
  });

  it('rejects an unrecognized extra field rather than silently accepting it', () => {
    expect(() =>
      targetDescriptorSchema.parse({ ...minimalDescriptor, value: 'leaked-typed-value' }),
    ).toThrowError();
  });
});
