/** Renders a form exercising every input type the capture engine's metadata-only heuristics must distinguish (docs/09-security-privacy.md §2). */
export function renderForms(container: HTMLElement): void {
  container.innerHTML = `
    <h1>Forms</h1>
    <form data-testid="fixture-form">
      <label>Full name <input type="text" name="fullName" autocomplete="name" /></label>
      <label>Email <input type="email" name="email" autocomplete="email" /></label>
      <label>Password <input type="password" name="password" autocomplete="new-password" /></label>
      <label>Card number <input type="text" name="cardNumber" autocomplete="cc-number" inputmode="numeric" /></label>
      <label>
        Country
        <select name="country">
          <option value="us">United States</option>
          <option value="ca">Canada</option>
        </select>
      </label>
      <label>Bio <textarea name="bio"></textarea></label>
      <label><input type="checkbox" name="rememberMe" /> Remember me</label>
      <button type="submit" data-testid="fixture-form-submit">Submit</button>
    </form>
    <p data-testid="fixture-form-status" hidden>Submitted</p>
  `;

  const form = container.querySelector<HTMLFormElement>('[data-testid="fixture-form"]');
  const status = container.querySelector<HTMLElement>('[data-testid="fixture-form-status"]');
  form?.addEventListener('submit', (event) => {
    // No fetch anywhere in this app — a client-side no-op keeps the fixture obviously
    // inert (nothing transmits anywhere, deliberately, given the fields above look sensitive).
    event.preventDefault();
    status?.removeAttribute('hidden');
  });
}
