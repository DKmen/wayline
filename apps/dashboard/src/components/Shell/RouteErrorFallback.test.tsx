import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { RouteErrorFallback } from './RouteErrorFallback';

/** Renders RouteErrorFallback the way it really runs: as a route's errorComponent. */
function renderThrowingRoute(
  loaderCallCount: { current: number },
  thrown: unknown = new Error('boom'),
) {
  const rootRoute = createRootRoute({
    loader: () => {
      loaderCallCount.current += 1;
      throw thrown;
    },
    errorComponent: RouteErrorFallback,
  });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ['/'] }),
    context: { queryClient: new QueryClient() },
  });

  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('RouteErrorFallback', () => {
  it('announces the thrown error via role="alert" with its message', async () => {
    renderThrowingRoute({ current: 0 });

    expect(await screen.findByRole('alert')).toHaveTextContent('boom');
  });

  it('falls back to a generic message when a non-Error value is thrown', async () => {
    renderThrowingRoute({ current: 0 }, 'a plain string, not an Error');

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong.');
  });

  it('re-runs the loader when Retry is activated', async () => {
    const loaderCallCount = { current: 0 };
    renderThrowingRoute(loaderCallCount);
    await screen.findByRole('alert');
    const callsBeforeRetry = loaderCallCount.current;

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(loaderCallCount.current).toBeGreaterThan(callsBeforeRetry);
  });
});
