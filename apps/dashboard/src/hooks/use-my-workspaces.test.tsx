import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMyWorkspaces } from './use-my-workspaces';

afterEach(() => {
  vi.unstubAllGlobals();
});

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useMyWorkspaces', () => {
  it('parses a populated workspaces response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            workspaces: [
              {
                workspace: {
                  id: '018f4f9e-7a3b-7c4d-9e1f-2a3b4c5d6e7f',
                  name: 'Acme',
                  slug: 'acme',
                  plan: 'free',
                },
                role: 'admin',
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    );

    const { result } = renderHook(() => useMyWorkspaces(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.workspaces).toHaveLength(1);
  });

  it('parses an empty workspaces response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ workspaces: [] }), { status: 200 })),
    );

    const { result } = renderHook(() => useMyWorkspaces(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.workspaces).toEqual([]);
  });

  it('surfaces a 401 as a query error rather than a thrown crash', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 401 })));

    const { result } = renderHook(() => useMyWorkspaces(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
