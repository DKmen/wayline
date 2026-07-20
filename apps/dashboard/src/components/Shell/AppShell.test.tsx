import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell';

afterEach(() => {
  vi.unstubAllGlobals();
});

function buildRouter() {
  const rootRoute = createRootRoute({ component: AppShell });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <p>Home content</p>,
  });
  const signInRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/sign-in',
    component: () => <p>Sign-in content</p>,
  });
  const routeTree = rootRoute.addChildren([indexRoute, signInRoute]);

  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
}

function renderShell() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = buildRouter();

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('AppShell', () => {
  it('renders a primary nav landmark and main content area', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify(null), { status: 200 })),
    );

    renderShell();

    expect(await screen.findByText('Home content')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
  });

  it('shows the signed-in email and a working sign-out action', async () => {
    const sessionBody = JSON.stringify({
      session: { expiresAt: '2026-08-01T00:00:00.000Z' },
      user: { id: 'user_1', email: 'ada@example.com', name: 'Ada' },
    });
    // Each call needs its own Response instance — a body can only be consumed once,
    // and this flow calls fetch twice: get-session, then the sign-out POST.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('/sign-out')) {
          return Promise.resolve(new Response(JSON.stringify({ status: true }), { status: 200 }));
        }
        return Promise.resolve(new Response(sessionBody, { status: 200 }));
      }),
    );

    renderShell();

    expect(await screen.findByText('ada@example.com')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(screen.getByText('Sign-in content')).toBeInTheDocument());
  });

  it('has no accessibility violations', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify(null), { status: 200 })),
    );

    const { container } = render(
      <QueryClientProvider client={new QueryClient()}>
        <RouterProvider router={buildRouter()} />
      </QueryClientProvider>,
    );
    await screen.findByText('Home content');

    expect(await axe(container)).toHaveNoViolations();
  });
});
