import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useFlows } from './use-flows';

afterEach(() => {
  vi.unstubAllGlobals();
});

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useFlows', () => {
  it('parses an empty flow library', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ flows: [] }), { status: 200 })),
    );

    const { result } = renderHook(() => useFlows('018f4f9e-7a3b-7c4d-9e1f-2a3b4c5d6e7f'), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.flows).toEqual([]);
  });

  it('surfaces a 403 as a query error rather than a thrown crash', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 403 })));

    const { result } = renderHook(() => useFlows('018f4f9e-7a3b-7c4d-9e1f-2a3b4c5d6e7f'), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
