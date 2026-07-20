import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { routeTree } from '../routeTree.gen';

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Builds the real app router (routeTree.gen.ts) so this exercises __root/_auth/sign-in as shipped. */
function buildRouter(queryClient: QueryClient, initialEntry: string) {
  return createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  });
}

function renderApp(sessionResponse: unknown, initialEntry = '/') {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify(sessionResponse), { status: 200 })),
  );

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = buildRouter(queryClient, initialEntry);

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return { router, queryClient };
}

describe('protected route guard (real route tree)', () => {
  it('redirects a signed-out visitor at / to /sign-in', async () => {
    renderApp(null);

    expect(await screen.findByLabelText('Email')).toBeInTheDocument();
  });

  it('renders the shell home for a signed-in visitor', async () => {
    renderApp({
      session: { expiresAt: '2026-08-01T00:00:00.000Z' },
      user: { id: 'user_1', email: 'ada@example.com', name: 'Ada' },
    });

    expect(await screen.findByText(/welcome, ada@example.com/i)).toBeInTheDocument();
  });

  it('bounces an already-signed-in visitor away from /sign-in back to the shell', async () => {
    renderApp(
      {
        session: { expiresAt: '2026-08-01T00:00:00.000Z' },
        user: { id: 'user_1', email: 'ada@example.com', name: 'Ada' },
      },
      '/sign-in',
    );

    expect(await screen.findByText(/welcome, ada@example.com/i)).toBeInTheDocument();
  });

  it('redirects mid-session once the session expires and the route re-validates', async () => {
    const { router, queryClient } = renderApp({
      session: { expiresAt: '2026-08-01T00:00:00.000Z' },
      user: { id: 'user_1', email: 'ada@example.com', name: 'Ada' },
    });
    await screen.findByText(/welcome, ada@example.com/i);

    // Simulate the session expiring server-side: the next get-session call returns null.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('null', { status: 200 })));
    queryClient.removeQueries({ queryKey: ['session'] });
    await router.invalidate();

    await waitFor(() => expect(screen.getByLabelText('Email')).toBeInTheDocument());
  });
});
