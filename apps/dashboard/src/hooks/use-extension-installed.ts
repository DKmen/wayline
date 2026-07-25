import { useQuery } from '@tanstack/react-query';
import { env } from '../env';
import { checkExtensionInstalled } from '../lib/extension';

/** Polls the extension's install ping every few seconds so onboarding UI reflects install state live, without a reload. */
export function useExtensionInstalled() {
  return useQuery({
    queryKey: ['extension-installed'],
    queryFn: () => checkExtensionInstalled(env.VITE_EXTENSION_ID),
    refetchInterval: 3000,
    retry: false,
  });
}
