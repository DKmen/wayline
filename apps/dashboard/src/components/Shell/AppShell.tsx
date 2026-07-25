import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Badge, Button } from '@wayline/ui';
import { env } from '../../env';
import { useExtensionInstalled } from '../../hooks/use-extension-installed';
import { useSession } from '../../hooks/use-session';
import { fetchJson } from '../../lib/api-client';
import { sendSessionEndedPing, sendSessionReadyPing } from '../../lib/extension';
import { sessionQueryOptions } from '../../lib/session';
import { SkipLink } from './SkipLink';

/** Signed-in shell: skip link, primary nav, and the active route's content. */
export function AppShell() {
  const { data: session } = useSession();
  const { data: extensionInstalled } = useExtensionInstalled();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [signOutError, setSignOutError] = useState(false);
  const sentReadyPing = useRef(false);

  useEffect(() => {
    // Fires once per mount, not on every 60s background refetch of the session query —
    // there's no discrete "sign-in just completed" event to hook (magic-link
    // verification redirects server-side), so "the signed-in shell rendered" is the
    // trigger (docs/03-architecture.md §3.2).
    if (session?.user && !sentReadyPing.current) {
      sentReadyPing.current = true;
      sendSessionReadyPing(env.VITE_EXTENSION_ID);
    }
  }, [session]);

  async function handleSignOut() {
    setSignOutError(false);
    try {
      await fetchJson('/api/auth/sign-out', { method: 'POST' });
    } catch {
      setSignOutError(true);
      return;
    }
    sendSessionEndedPing(env.VITE_EXTENSION_ID);
    // Sign-out just succeeded server-side, so the answer is already known — write it
    // directly instead of invalidateQueries, which would trigger a redundant refetch
    // of the still-active session query and delay the redirect below on it.
    queryClient.setQueryData(sessionQueryOptions.queryKey, null);
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
        <div className="flex items-center gap-3">
          <Badge variant={extensionInstalled ? 'default' : 'outline'}>
            {extensionInstalled ? 'Extension installed' : 'Extension not detected'}
          </Badge>
          {session?.user ? (
            <>
              {signOutError ? (
                <span role="alert" className="text-sm text-destructive">
                  Couldn&apos;t sign out. Try again.
                </span>
              ) : null}
              <span className="text-sm text-muted-foreground">{session.user.email}</span>
              <Button variant="outline" onClick={handleSignOut}>
                Sign out
              </Button>
            </>
          ) : null}
        </div>
      </header>
      <main id="main" className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
