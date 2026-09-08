// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  buildTargetSnapshot,
  getAccessibleName,
  getElementBbox,
  getFieldName,
  getFieldType,
  getImplicitRole,
} from './metadata';

function el(html: string): Element {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);
  return container.firstElementChild as Element;
}

describe('getAccessibleName', () => {
  it('reads the aria-label attribute', () => {
    expect(getAccessibleName(el('<button aria-label="Submit form"></button>'))).toBe('Submit form');
  });

  it("resolves aria-labelledby to the referenced element's own aria-label", () => {
    document.body.innerHTML =
      '<span id="lbl" aria-label="Work email"></span><input aria-labelledby="lbl" />';
    const input = document.querySelector('input') as Element;
    expect(getAccessibleName(input)).toBe('Work email');
  });

  it('falls through to the next fallback when aria-labelledby points to an id that does not exist', () => {
    document.body.innerHTML = '<input aria-labelledby="missing" placeholder="Fallback" />';
    const input = document.querySelector('input') as Element;
    expect(getAccessibleName(input)).toBe('Fallback');
  });

  it('falls through to the next fallback when the aria-labelledby target has no aria-label', () => {
    document.body.innerHTML =
      '<span id="lbl">Work email</span><input aria-labelledby="lbl" placeholder="Fallback" />';
    const input = document.querySelector('input') as Element;
    expect(getAccessibleName(input)).toBe('Fallback');
  });

  it('falls back to the placeholder attribute', () => {
    expect(getAccessibleName(el('<input placeholder="Enter your email" />'))).toBe(
      'Enter your email',
    );
  });

  it('returns null when no aria-label, aria-labelledby target, or placeholder exists', () => {
    expect(getAccessibleName(el('<div></div>'))).toBeNull();
  });
});

describe('getFieldType', () => {
  it('returns the input type, lowercased', () => {
    expect(getFieldType(el('<input type="PASSWORD" />'))).toBe('password');
  });

  it('defaults a typeless input to "text"', () => {
    expect(getFieldType(el('<input />'))).toBe('text');
  });

  it('returns "select" for a <select>', () => {
    expect(getFieldType(el('<select></select>'))).toBe('select');
  });

  it('returns "textarea" for a <textarea>', () => {
    expect(getFieldType(el('<textarea></textarea>'))).toBe('textarea');
  });

  it('returns null for a non-form element', () => {
    expect(getFieldType(el('<div></div>'))).toBeNull();
  });
});

describe('getFieldName', () => {
  it('reads the name attribute of a form control', () => {
    expect(getFieldName(el('<input name="email" />'))).toBe('email');
  });

  it('returns null when there is no name attribute', () => {
    expect(getFieldName(el('<input />'))).toBeNull();
  });

  it('returns null for a non-form element', () => {
    expect(getFieldName(el('<div name="ignored"></div>'))).toBeNull();
  });
});

describe('getImplicitRole', () => {
  it('prefers an explicit role attribute', () => {
    expect(getImplicitRole(el('<div role="button"></div>'))).toBe('button');
  });

  it('infers "button" for a <button>', () => {
    expect(getImplicitRole(el('<button></button>'))).toBe('button');
  });

  it('infers "link" for an anchor with href', () => {
    expect(getImplicitRole(el('<a href="/x"></a>'))).toBe('link');
  });

  it('infers "textbox" for a text input', () => {
    expect(getImplicitRole(el('<input type="text" />'))).toBe('textbox');
  });

  it('defaults a typeless input to "textbox"', () => {
    expect(getImplicitRole(el('<input />'))).toBe('textbox');
  });

  it('returns null when no explicit or inferable role exists', () => {
    expect(getImplicitRole(el('<span></span>'))).toBeNull();
  });
});

describe('getElementBbox', () => {
  it('returns the bounding rect plus viewport dimensions', () => {
    const target = el('<button></button>');
    expect(getElementBbox(target)).toEqual({
      x: 0,
      y: 0,
      w: 0,
      h: 0,
      vw: window.innerWidth,
      vh: window.innerHeight,
    });
  });
});

describe('buildTargetSnapshot', () => {
  it('assembles tagName, role, accessibleName, fieldType, fieldName, and bbox', () => {
    const input = el('<input type="email" name="workEmail" placeholder="Work email" />');
    expect(buildTargetSnapshot(input)).toEqual({
      tagName: 'input',
      role: 'textbox',
      accessibleName: 'Work email',
      fieldType: 'email',
      fieldName: 'workEmail',
      bbox: { x: 0, y: 0, w: 0, h: 0, vw: window.innerWidth, vh: window.innerHeight },
    });
  });

  it('never includes a captured typed value for a password field carrying a secret', () => {
    const input = el('<input type="password" name="password" value="hunter2-secret" />');
    const snapshot = buildTargetSnapshot(input);
    expect(JSON.stringify(snapshot)).not.toContain('hunter2-secret');
  });

  it('never includes rendered text for a textarea carrying sensitive content', () => {
    const textarea = el('<textarea name="notes">confidential-note-text</textarea>');
    const snapshot = buildTargetSnapshot(textarea);
    expect(JSON.stringify(snapshot)).not.toContain('confidential-note-text');
  });

  it('never includes the chosen option for a <select>', () => {
    document.body.innerHTML =
      '<select name="country"><option value="us">United States</option><option value="fr" selected>France</option></select>';
    const select = document.querySelector('select') as HTMLSelectElement;
    const snapshot = buildTargetSnapshot(select);
    expect(JSON.stringify(snapshot)).not.toContain('France');
    expect(JSON.stringify(snapshot)).not.toContain('fr');
  });
});
