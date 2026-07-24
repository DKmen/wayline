import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceLibrary } from './WorkspaceLibrary';

afterEach(() => {
  vi.unstubAllGlobals();
});

const workspace = {
  id: '018f4f9e-7a3b-7c4d-9e1f-2a3b4c5d6e7f',
  name: 'Acme',
  slug: 'acme',
  plan: 'free' as const,
};

function renderWithClient(role: 'admin' | 'creator' | 'viewer') {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ flows: [] }), { status: 200 })),
  );
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <WorkspaceLibrary workspace={workspace} role={role} />
    </QueryClientProvider>,
  );
}

describe('WorkspaceLibrary', () => {
  it('shows creation-oriented copy for an admin', () => {
    renderWithClient('admin');

    expect(screen.getByText('No flows yet')).toBeInTheDocument();
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });

  it('shows the same creation-oriented copy for a creator as for an admin', () => {
    renderWithClient('creator');

    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });

  it('shows passive, non-creation copy for a viewer', () => {
    renderWithClient('viewer');

    expect(screen.getByText('No flows yet')).toBeInTheDocument();
    expect(screen.getByText(/shared with you/i)).toBeInTheDocument();
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });
});
