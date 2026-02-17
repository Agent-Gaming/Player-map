import { useQuery } from '@tanstack/react-query';
import { Network } from './useAtomData';
import { fetchPositions } from '../api/fetchPositions';


export const usePositions = (
  accountId: string | undefined,
  network: Network = Network.MAINNET
) => {
  const { data, isLoading, error, isError } = useQuery({
    queryKey: ['positions', accountId, network],
    queryFn: () => fetchPositions(accountId!, network),
    enabled: Boolean(accountId), // Ne fetch que si accountId existe
    staleTime: 2 * 60 * 1000, // Cache 2 minutes
    gcTime: 5 * 60 * 1000,    // Garde en mémoire 5 minutes
    retry: 1,
  });

  return {
    positions: data || [],
    loading: isLoading,
    error: isError ? (error as Error) : null,
  };
};
