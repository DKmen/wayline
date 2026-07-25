import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../env', () => ({ env: { VITE_API_URL: '', VITE_EXTENSION_ID: 'test-extension-id' } }));

const { useExtensionInstalled } = await import('./use-extension-installed');

afterEach(() => {
  vi.unstubAllGlobals();
});

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useExtensionInstalled', () => {
  it('resolves true when the extension responds to the ping', async () => {
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: (_id: string, _message: unknown, callback: (response: unknown) => void) =>
          callback({ installed: true }),
      },
    });

    const { result } = renderHook(() => useExtensionInstalled(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(true);
  });

  it('resolves false when the extension is not installed', async () => {
    const { result } = renderHook(() => useExtensionInstalled(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(false);
  });
});
