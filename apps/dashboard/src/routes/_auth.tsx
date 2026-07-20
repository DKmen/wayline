import { createFileRoute, redirect } from '@tanstack/react-router';
import { AppShell } from '../components/Shell/AppShell';
import { PendingFallback } from '../components/Shell/PendingFallback';
import { RouteErrorFallback } from '../components/Shell/RouteErrorFallback';
import { sessionQueryOptions } from '../lib/session';

/** Protected layout — every route nested under this one requires a live session. */
export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions);
    if (!session) {
      throw redirect({ to: '/sign-in', search: { redirect: location.href } });
    }
  },
  component: AppShell,
  pendingComponent: PendingFallback,
  errorComponent: RouteErrorFallback,
});
