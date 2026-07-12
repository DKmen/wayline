export type PageRenderer = (container: HTMLElement) => void;

const routes = new Map<string, PageRenderer>();
let pageContainer: HTMLElement;

/** Registers a page renderer for an exact pathname. */
export function registerRoute(path: string, render: PageRenderer): void {
  routes.set(path, render);
}

function renderCurrentRoute(): void {
  const render = routes.get(window.location.pathname);
  render?.(pageContainer);
}

/** Navigates client-side via the History API (docs/06 §3's webNavigation.onHistoryStateUpdated signal) — never triggers a full page load. */
export function navigate(path: string): void {
  window.history.pushState({}, '', path);
  renderCurrentRoute();
}

/** Wires up the router: intercepts data-nav link clicks, handles back/forward, renders the initial route. */
export function initRouter(container: HTMLElement): void {
  pageContainer = container;

  document.body.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const link = target.closest<HTMLAnchorElement>('a[data-nav]');
    if (!link) return;
    event.preventDefault();
    navigate(link.getAttribute('href') ?? '/');
  });

  window.addEventListener('popstate', renderCurrentRoute);

  renderCurrentRoute();
}
