import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';
import { SignInForm } from '../components/Auth/SignInForm';
import { sessionQueryOptions } from '../lib/session';

const signInSearchSchema = z.object({ redirect: z.string().optional() });

/** Public sign-in route — bounces already-signed-in users straight to the shell. */
export const Route = createFileRoute('/sign-in')({
  validateSearch: signInSearchSchema,
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions);
    if (session) throw redirect({ to: '/' });
  },
  component: () => (
    <div className="flex min-h-dvh items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <SignInForm />
      </div>
    </div>
  ),
});
