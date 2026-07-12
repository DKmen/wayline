/** Renders a page whose target element can be swapped for a genuinely different one (docs/06 §6's target-missing detection). */
export function renderTargetChange(container: HTMLElement): void {
  container.innerHTML = `
    <h1>Target change</h1>
    <div data-testid="target-change-slot">
      <button type="button" data-testid="original-target">Original target</button>
    </div>
    <button type="button" data-testid="trigger-change">Simulate DOM update</button>
  `;

  const trigger = container.querySelector<HTMLElement>('[data-testid="trigger-change"]');
  const slot = container.querySelector<HTMLElement>('[data-testid="target-change-slot"]');
  trigger?.addEventListener('click', () => {
    if (!slot) return;
    // A genuinely different element (tag + text), not a re-styled copy of the same one —
    // proves the original descriptor's signals no longer resolve to anything.
    slot.innerHTML = '<p data-testid="replacement-target">Replacement content, not a button</p>';
  });
}
