// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ActionCandidateMessage } from './messages';
import { isActionCandidateMessage } from './messages';
import { registerCaptureListeners } from './listeners';

/** The nth message a `sendMessage` mock received, or throws — avoids unchecked index access in assertions. */
function sentMessage(sendMessage: ReturnType<typeof vi.fn>, index = 0): ActionCandidateMessage {
  const call = sendMessage.mock.calls[index];
  if (!call) throw new Error(`sendMessage was not called at index ${index}`);
  return call[0] as ActionCandidateMessage;
}

function setup() {
  document.body.innerHTML = '';
  const overlayHost = document.createElement('div');
  document.body.appendChild(overlayHost);
  const shadow = overlayHost.attachShadow({ mode: 'open' });
  const overlayButton = document.createElement('button');
  shadow.appendChild(overlayButton);

  const sendMessage = vi.fn();
  let clock = 0;
  const now = () => clock;
  const advance = (ms: number) => {
    clock += ms;
  };
  const stop = registerCaptureListeners(document, sendMessage, overlayHost, now);

  return { overlayHost, overlayButton, sendMessage, advance, stop };
}

let cleanup: (() => void) | null = null;

afterEach(() => {
  cleanup?.();
  cleanup = null;
  document.body.innerHTML = '';
});

describe('registerCaptureListeners', () => {
  it('sends one well-formed candidate for a click on a labeled button', () => {
    const { stop, sendMessage } = setup();
    cleanup = stop;

    const button = document.createElement('button');
    button.setAttribute('aria-label', 'Submit');
    document.body.appendChild(button);
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

    expect(sendMessage).toHaveBeenCalledTimes(1);
    const message = sentMessage(sendMessage);
    expect(isActionCandidateMessage(message)).toBe(true);
    expect(message.action).toBe('click');
    expect(message.instruction).toBe("Click 'Submit'");
  });

  it('sends an action: "select" candidate for a change on a <select>', () => {
    const { stop, sendMessage } = setup();
    cleanup = stop;

    document.body.innerHTML +=
      '<select aria-label="Country"><option value="us">US</option></select>';
    const select = document.querySelector('select') as HTMLSelectElement;
    select.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sentMessage(sendMessage).action).toBe('select');
  });

  it('sends an action: "input" candidate for a change on a text input', () => {
    const { stop, sendMessage } = setup();
    cleanup = stop;

    document.body.innerHTML += '<input type="text" name="fullName" />';
    const input = document.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sentMessage(sendMessage).action).toBe('input');
  });

  it('sends an action: "submit" candidate for a real form submit', () => {
    const { stop, sendMessage } = setup();
    cleanup = stop;

    document.body.innerHTML += '<form aria-label="Sign up"></form>';
    const form = document.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true, composed: true }));

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sentMessage(sendMessage).action).toBe('submit');
  });

  it('treats Enter as a submit signal on a field with no enclosing form', () => {
    const { stop, sendMessage } = setup();
    cleanup = stop;

    document.body.innerHTML += '<input type="text" aria-label="Search" />';
    const input = document.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }),
    );

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sentMessage(sendMessage).action).toBe('submit');
  });

  it('does not double-fire for Enter inside a <form> — the real submit event covers it', () => {
    const { stop, sendMessage } = setup();
    cleanup = stop;

    document.body.innerHTML += '<form><input type="text" /></form>';
    const input = document.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }),
    );

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('does not treat Enter in a textarea as a submit signal', () => {
    const { stop, sendMessage } = setup();
    cleanup = stop;

    document.body.innerHTML += '<textarea></textarea>';
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    textarea.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }),
    );

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('stops producing candidates once torn down', () => {
    const { stop, sendMessage } = setup();

    const button = document.createElement('button');
    document.body.appendChild(button);
    stop();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('collapses a repeated click on the same target within the declick window into one candidate', () => {
    const { stop, sendMessage, advance } = setup();
    cleanup = stop;

    const button = document.createElement('button');
    document.body.appendChild(button);
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    advance(100);
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it('produces a new candidate once the declick window has elapsed', () => {
    const { stop, sendMessage, advance } = setup();
    cleanup = stop;

    const button = document.createElement('button');
    document.body.appendChild(button);
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    advance(600);
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

    expect(sendMessage).toHaveBeenCalledTimes(2);
  });

  it("ignores a click on an element inside Wayline's own overlay", () => {
    const { stop, sendMessage, overlayButton } = setup();
    cleanup = stop;

    overlayButton.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('ignores a change event on an element inside the overlay', () => {
    const { stop, sendMessage, overlayButton } = setup();
    cleanup = stop;

    overlayButton.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('ignores a submit event on an element inside the overlay', () => {
    const { stop, sendMessage, overlayButton } = setup();
    cleanup = stop;

    overlayButton.dispatchEvent(new Event('submit', { bubbles: true, composed: true }));

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('ignores an Enter keydown on an element inside the overlay', () => {
    const { stop, sendMessage, overlayButton } = setup();
    cleanup = stop;

    overlayButton.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }),
    );

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('ignores events whose target is not an Element (composedPath resolves to null)', () => {
    const { stop, sendMessage } = setup();
    cleanup = stop;

    document.dispatchEvent(new Event('change'));
    document.dispatchEvent(new Event('submit'));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    document.dispatchEvent(new MouseEvent('click'));

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('never registers focus, pointermove, or scroll listeners', () => {
    document.body.innerHTML = '';
    const overlayHost = document.createElement('div');
    document.body.appendChild(overlayHost);
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
    const stop = registerCaptureListeners(document, vi.fn(), overlayHost);
    cleanup = stop;

    const registeredTypes = addEventListenerSpy.mock.calls.map((call) => call[0]);
    expect(registeredTypes).not.toContain('focus');
    expect(registeredTypes).not.toContain('pointermove');
    expect(registeredTypes).not.toContain('scroll');
    addEventListenerSpy.mockRestore();
  });

  it('never includes a captured typed value when a password field changes', () => {
    const { stop, sendMessage } = setup();
    cleanup = stop;

    document.body.innerHTML += '<input type="password" name="password" value="hunter2-secret" />';
    const input = document.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(sentMessage(sendMessage))).not.toContain('hunter2-secret');
  });
});
