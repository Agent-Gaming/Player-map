import { useQuery } from '@tanstack/react-query';
import { fetchLoadout } from './cosmeticsLoadoutApi';

// Public endpoint — works for the connected player's own address or any
// viewed player's address (see RightPanel.tsx's ProfileContent /
// OtherPlayerProfileContent, same pattern as usePlayerArchetype).
export function useLoadout(address?: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['cosmeticsLoadout', address],
    queryFn: () => fetchLoadout(address!),
    enabled: Boolean(address),
    staleTime: 30 * 1000,
    retry: 1,
  });

  return {
    loadout: data ?? null,
    isLoading,
    error: error as Error | null,
  };
}
