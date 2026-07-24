import type { MyWorkspacesResponse } from '@wayline/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { myWorkspacesQueryOptions } from '../../lib/workspaces';
import { Route } from './index';

const DashboardHome = Route.options.component!;

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Seeds the my-workspaces cache directly — DashboardHome reads it via the real useMyWorkspaces hook. */
function renderWithSeededData(data: MyWorkspacesResponse) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(myWorkspacesQueryOptions.queryKey, data);
  render(
    <QueryClientProvider client={queryClient}>
      <DashboardHome />
    </QueryClientProvider>,
  );
}

describe('DashboardHome', () => {
  it('renders the creation form once the caller has no workspaces yet', () => {
    renderWithSeededData({ workspaces: [] });

    expect(screen.getByText('Create your workspace')).toBeInTheDocument();
  });

  it('renders the library, role-aware, once the caller belongs to a workspace', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ flows: [] }), { status: 200 })),
    );

    renderWithSeededData({
      workspaces: [
        {
          workspace: {
            id: '018f4f9e-7a3b-7c4d-9e1f-2a3b4c5d6e7f',
            name: 'Acme',
            slug: 'acme',
            plan: 'free',
          },
          role: 'viewer',
        },
      ],
    });

    expect(screen.getByText('No flows yet')).toBeInTheDocument();
    expect(screen.getByText(/shared with you/i)).toBeInTheDocument();
  });

  it('lands directly on the empty library after creation, with no reload (WAYLI-30 acceptance)', async () => {
    const createdWorkspace = {
      id: '018f4f9e-7a3b-7c4d-9e1f-2a3b4c5d6e7f',
      name: 'Acme',
      slug: 'acme',
      plan: 'free',
    };
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/v1/workspaces')) {
          return Promise.resolve(new Response(JSON.stringify(createdWorkspace), { status: 201 }));
        }
        return Promise.resolve(new Response(JSON.stringify({ flows: [] }), { status: 200 }));
      }),
    );

    renderWithSeededData({ workspaces: [] });
    await userEvent.type(screen.getByLabelText('Workspace name'), 'Acme');
    await userEvent.click(screen.getByRole('button', { name: /create workspace/i }));

    expect(await screen.findByText('No flows yet')).toBeInTheDocument();
    expect(screen.queryByText('Create your workspace')).not.toBeInTheDocument();
  });
});
