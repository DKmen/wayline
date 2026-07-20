import { createFileRoute } from '@tanstack/react-router';
import { useSession } from '../../hooks/use-session';

/** Signed-in home — workspace-agnostic placeholder; workspace listing lands in WAYLI-30. */
export const Route = createFileRoute('/_auth/')({
  component: DashboardHome,
});

function DashboardHome() {
  const { data: session } = useSession();

  return (
    <div className="p-8">
      <h1 className="text-xl font-medium text-foreground">
        Welcome{session?.user ? `, ${session.user.email}` : ''}
      </h1>
    </div>
  );
}
