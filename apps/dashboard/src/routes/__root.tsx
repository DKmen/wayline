import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { PendingFallback } from '../components/Shell/PendingFallback';
import { RouteErrorFallback } from '../components/Shell/RouteErrorFallback';

interface RouterContext {
  queryClient: QueryClient;
}

/** Root route — no chrome of its own, just the outlet and shared pending/error boundaries. */
export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
  pendingComponent: PendingFallback,
  errorComponent: RouteErrorFallback,
});
