import type { Role, Workspace } from '@wayline/shared-types';
import { EmptyState } from '@wayline/ui';
import { useFlows } from '../../hooks/use-flows';

interface WorkspaceLibraryProps {
  workspace: Workspace;
  role: Role;
}

/** Role-aware empty state — always empty until S3 ships flow creation, but backed by a real query. */
export function WorkspaceLibrary({ workspace, role }: WorkspaceLibraryProps) {
  useFlows(workspace.id);

  const description =
    role === 'viewer'
      ? 'Flows shared with you will appear here.'
      : 'Flow capture is coming soon — check back once it ships.';

  return <EmptyState title="No flows yet" description={description} />;
}
