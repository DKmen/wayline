import { Link, Outlet, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@wayline/ui';
import { useSession } from '../../hooks/use-session';
import { fetchJson } from '../../lib/api-client';
import { SkipLink } from './SkipLink';

/** Signed-in shell: skip link, primary nav, and the active route's content. */
export function AppShell() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  async function handleSignOut() {
    await fetchJson('/api/auth/sign-out', { method: 'POST' });
    await queryClient.invalidateQueries({ queryKey: ['session'] });
    await navigate({ to: '/sign-in' });
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <nav aria-label="Primary">
          {/* TanStack Router stamps aria-current="page" on the active Link automatically. */}
          <Link to="/" className="font-medium text-foreground aria-[current=page]:text-primary">
            Wayline
          </Link>
        </nav>
        {session?.user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{session.user.email}</span>
            <Button variant="outline" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        ) : null}
      </header>
      <main id="main" className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
