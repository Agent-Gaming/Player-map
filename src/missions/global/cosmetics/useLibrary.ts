import { useQuery } from '@tanstack/react-query';
import { fetchLibrary } from './cosmeticsLoadoutApi';

interface UseLibraryProps {
  address?: string;
  getAccessToken?: () => Promise<string | null>;
}

// Authenticated — only ever called for the connected player's own address
// (the library picker is own-profile-only, see RightPanel.tsx).
export function useLibrary({ address, getAccessToken }: UseLibraryProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['cosmeticsLibrary', address],
    queryFn: () => fetchLibrary(address!, getAccessToken!),
    enabled: Boolean(address) && Boolean(getAccessToken),
    staleTime: 30 * 1000,
    retry: 1,
  });

  return {
    items: data ?? [],
    isLoading,
    error: error as Error | null,
  };
}
