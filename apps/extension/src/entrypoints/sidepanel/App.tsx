import { EmptyState } from '@wayline/ui';

/** Side panel — live walkthrough UI (docs/06-extension-spec.md §1, §5). The walkthrough state machine lands with the S6 sprint; this is the scaffold's empty state. */
export function App() {
  return (
    <EmptyState
      title="No active walkthrough yet"
      description="Open a shared Wayline link to start one."
    />
  );
}
