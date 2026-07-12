/** A custom element with an open shadow root, exercising docs/06 §4's shadow-piercing ("pierce") descriptor signal. */
export class FixtureWidget extends HTMLElement {
  connectedCallback(): void {
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <button type="button" data-testid="shadow-button">Click me (in shadow root)</button>
    `;
    const button = shadow.querySelector('button');
    button?.addEventListener('click', () => {
      button.textContent = 'Clicked!';
    });
  }
}

customElements.define('fixture-widget', FixtureWidget);
