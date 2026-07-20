import { useRouter } from '@tanstack/react-router';
import { Button } from '@wayline/ui';

interface RouteErrorFallbackProps {
  error: unknown;
}

/** Shown when a route's loader/component throws — announced via role="alert", with a real retry action. */
export function RouteErrorFallback({ error }: RouteErrorFallbackProps) {
  const router = useRouter();
  const message = error instanceof Error ? error.message : 'Something went wrong.';

  return (
    <div role="alert" className="flex h-full flex-col items-center justify-center gap-3 p-8">
      <p className="text-foreground">{message}</p>
      <Button onClick={() => router.invalidate()}>Retry</Button>
    </div>
  );
}
