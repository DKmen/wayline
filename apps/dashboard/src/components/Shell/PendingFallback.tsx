/** Shown while a route's data is loading — announced to assistive tech via role="status". */
export function PendingFallback() {
  return (
    <div
      role="status"
      className="flex h-full items-center justify-center p-8 text-muted-foreground"
    >
      Loading…
    </div>
  );
}
