import { describe, expect, it } from 'vitest';
import { isRestrictedUrl } from './isRestrictedUrl';

describe('isRestrictedUrl', () => {
  it('accepts an ordinary https page', () => {
    expect(isRestrictedUrl('https://example.com/checkout')).toBe(false);
  });

  it('accepts an ordinary http page', () => {
    expect(isRestrictedUrl('http://localhost:4300/')).toBe(false);
  });

  it('rejects chrome:// pages', () => {
    expect(isRestrictedUrl('chrome://extensions/')).toBe(true);
  });

  it('rejects other-extension pages', () => {
    expect(isRestrictedUrl('chrome-extension://abcdefg/popup.html')).toBe(true);
  });

  it('rejects edge:// and about: pages', () => {
    expect(isRestrictedUrl('edge://settings')).toBe(true);
    expect(isRestrictedUrl('about:blank')).toBe(true);
  });

  it('rejects Chrome Web Store pages', () => {
    expect(isRestrictedUrl('https://chromewebstore.google.com/detail/abc')).toBe(true);
    expect(isRestrictedUrl('https://chrome.google.com/webstore/detail/abc')).toBe(true);
  });
});
