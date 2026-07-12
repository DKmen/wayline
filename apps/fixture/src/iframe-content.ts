import './styles.css';

const app = document.getElementById('iframe-app');
if (app) {
  app.innerHTML = `<button type="button" data-testid="iframe-button">Click me (inside iframe)</button>`;
}
