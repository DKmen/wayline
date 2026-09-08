// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  isDeclickWithinWindow,
  isInsideWaylineOverlay,
  NOISE_DECLICK_WINDOW_MS,
} from './noise-filter';

function createOverlay(): { host: HTMLElement; innerButton: HTMLElement } {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });
  const innerButton = document.createElement('button');
  shadow.appendChild(innerButton);
  return { host, innerButton };
}

describe('isInsideWaylineOverlay', () => {
  it('returns true for an element inside the overlay shadow root', () => {
    const { host, innerButton } = createOverlay();
    expect(isInsideWaylineOverlay(innerButton, host)).toBe(true);
  });

  it('returns true when the element is the overlay host itself', () => {
    const { host } = createOverlay();
    expect(isInsideWaylineOverlay(host, host)).toBe(true);
  });

  it('returns false for a page element outside the overlay', () => {
    const { host } = createOverlay();
    const pageButton = document.createElement('button');
    document.body.appendChild(pageButton);
    expect(isInsideWaylineOverlay(pageButton, host)).toBe(false);
  });

  it('returns true for a light-DOM descendant of the overlay root (no shadow root involved)', () => {
    const host = document.createElement('div');
    const child = document.createElement('span');
    host.appendChild(child);
    document.body.appendChild(host);
    expect(isInsideWaylineOverlay(child, host)).toBe(true);
  });

  it('returns false for an unrelated element when the overlay root has no shadow root at all', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const pageButton = document.createElement('button');
    document.body.appendChild(pageButton);
    expect(isInsideWaylineOverlay(pageButton, host)).toBe(false);
  });
});

describe('isDeclickWithinWindow', () => {
  const target = document.createElement('button');

  it('returns false when there is no prior click', () => {
    expect(isDeclickWithinWindow(target, 1000, null)).toBe(false);
  });

  it('returns true for the same target within the declick window', () => {
    expect(isDeclickWithinWindow(target, 1100, { target, timestamp: 1000 })).toBe(true);
  });

  it('returns false for the same target once the window has elapsed', () => {
    expect(
      isDeclickWithinWindow(target, 1000 + NOISE_DECLICK_WINDOW_MS, {
        target,
        timestamp: 1000,
      }),
    ).toBe(false);
  });

  it('returns false for a different target, even within the time window', () => {
    const otherTarget = document.createElement('button');
    expect(isDeclickWithinWindow(otherTarget, 1100, { target, timestamp: 1000 })).toBe(false);
  });
});
