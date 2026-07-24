import { createFileRoute } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { CreateWorkspaceForm } from '../../components/Workspace/CreateWorkspaceForm';
import { WorkspaceLibrary } from '../../components/Workspace/WorkspaceLibrary';
import { useMyWorkspaces } from '../../hooks/use-my-workspaces';
import { myWorkspacesQueryOptions } from '../../lib/workspaces';

/** Signed-in home — creation form until the caller has a workspace, then its (always-admin-first) library. */
export const Route = createFileRoute('/_auth/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(myWorkspacesQueryOptions),
  component: DashboardHome,
});

function DashboardHome() {
  const { data } = useMyWorkspaces();
  const queryClient = useQueryClient();

  const membership = data?.workspaces[0];
  if (!membership) {
    return (
      <div className="p-8">
        <CreateWorkspaceForm
          onCreated={(workspace) => {
            queryClient.setQueryData(myWorkspacesQueryOptions.queryKey, {
              workspaces: [{ workspace, role: 'admin' }],
            });
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-8">
      <WorkspaceLibrary workspace={membership.workspace} role={membership.role} />
    </div>
  );
}
