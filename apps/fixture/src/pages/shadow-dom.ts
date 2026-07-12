import '../components/fixture-widget';

/** Renders a page containing a custom element with an open shadow root. */
export function renderShadowDom(container: HTMLElement): void {
  container.innerHTML = `
    <h1>Shadow DOM</h1>
    <fixture-widget data-testid="fixture-widget"></fixture-widget>
  `;
}
