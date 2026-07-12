/** Renders a page with a same-origin iframe (docs/06 §3) — cross-origin is deferred to Sprint 2 alongside the extension. */
export function renderIframe(container: HTMLElement): void {
  container.innerHTML = `
    <h1>Iframe</h1>
    <iframe data-testid="fixture-iframe" src="/iframe-content.html" title="Fixture iframe content"></iframe>
  `;
}
