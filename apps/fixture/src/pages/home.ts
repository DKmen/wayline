/** Renders the fixture's navigation hub — links to every other fixture page. */
export function renderHome(container: HTMLElement): void {
  container.innerHTML = `
    <h1>Wayline Fixture</h1>
    <p>Deterministic test-target pages for capture/walkthrough development (docs/06-extension-spec.md).</p>
  `;
}
