// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { isSensitiveField } from './sensitive-field';

function el(html: string): Element {
  const container = document.createElement('div');
  container.innerHTML = html;
  return container.firstElementChild as Element;
}

describe('isSensitiveField', () => {
  it('flags a password input', () => {
    expect(isSensitiveField(el('<input type="password" />'))).toBe(true);
  });

  it('flags a credit-card autocomplete hint', () => {
    expect(isSensitiveField(el('<input autocomplete="cc-number" />'))).toBe(true);
  });

  it('flags a name/id suggesting a social security number', () => {
    expect(isSensitiveField(el('<input name="ssn" />'))).toBe(true);
    expect(isSensitiveField(el('<input id="socialSecurityNumber" />'))).toBe(true);
  });

  it('flags a name suggesting a card number', () => {
    expect(isSensitiveField(el('<input name="cardNumber" />'))).toBe(true);
  });

  it('does not flag a plain text field', () => {
    expect(isSensitiveField(el('<input type="text" name="fullName" />'))).toBe(false);
  });

  it('does not flag a non-form element', () => {
    expect(isSensitiveField(el('<div name="ssn"></div>'))).toBe(false);
  });
});
