/** Renders three structurally identical buttons — same role, same accessible name, no distinguishing signal (docs/06 §4's 0.2 lead-margin ambiguity threshold). */
export function renderAmbiguous(container: HTMLElement): void {
  container.innerHTML = `
    <h1>Ambiguous targets</h1>
    <ul>
      <li><button type="button">Delete</button></li>
      <li><button type="button">Delete</button></li>
      <li><button type="button">Delete</button></li>
    </ul>
  `;
}
