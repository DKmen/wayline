import './styles.css';
import { initRouter, registerRoute } from './router';
import { renderHome } from './pages/home';
import { renderForms } from './pages/forms';
import { renderShadowDom } from './pages/shadow-dom';
import { renderIframe } from './pages/iframe';
import { renderTargetChange } from './pages/target-change';
import { renderAmbiguous } from './pages/ambiguous';

declare global {
  interface Window {
    __navLoadCount: number;
  }
}

// Incremented exactly once per real page load — Playwright asserts this stays constant
// across in-app navigation, proving route changes never trigger a full reload.
window.__navLoadCount = (window.__navLoadCount ?? 0) + 1;

function renderShell(root: HTMLElement): HTMLElement {
  root.innerHTML = `
    <nav data-testid="main-nav">
      <a href="/" data-nav>Home</a>
      <a href="/forms" data-nav>Forms</a>
      <a href="/shadow-dom" data-nav>Shadow DOM</a>
      <a href="/iframe" data-nav>Iframe</a>
      <a href="/target-change" data-nav>Target change</a>
      <a href="/ambiguous" data-nav>Ambiguous</a>
    </nav>
    <main id="page-content"></main>
  `;
  const content = root.querySelector<HTMLElement>('#page-content');
  if (!content) throw new Error('Missing #page-content container');
  return content;
}

registerRoute('/', renderHome);
registerRoute('/forms', renderForms);
registerRoute('/shadow-dom', renderShadowDom);
registerRoute('/iframe', renderIframe);
registerRoute('/target-change', renderTargetChange);
registerRoute('/ambiguous', renderAmbiguous);

const app = document.getElementById('app');
if (!app) throw new Error('Missing #app container');
initRouter(renderShell(app));
