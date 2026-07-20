import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';
import { SignInForm } from '../components/Auth/SignInForm';
import { sessionQueryOptions } from '../lib/session';

const signInSearchSchema = z.object({ redirect: z.string().optional() });

/** Public sign-in route — bounces already-signed-in users straight back to where they were headed. */
export const Route = createFileRoute('/sign-in')({
  validateSearch: signInSearchSchema,
  beforeLoad: async ({ context, search }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions);
    if (session) throw redirect({ href: search.redirect ?? '/' });
  },
  component: SignInRoute,
});

function SignInRoute() {
  const { redirect: redirectTo } = Route.useSearch();

  return (
    <div className="flex min-h-dvh items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <SignInForm callbackPath={redirectTo ?? '/'} />
      </div>
    </div>
  );
}
