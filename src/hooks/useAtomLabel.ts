import { useQuery } from '@tanstack/react-query';
import { Network } from './useAtomData';
import { fetchAtomDetails } from '../api/fetchAtomDetails';

/**
 * Fetches the label of an atom by its ID from the indexer.
 * Used to display dynamic names (e.g. game name) without hardcoding.
 */
export const useAtomLabel = (
  atomId: string | undefined,
  network: Network = Network.MAINNET,
  fallback = 'this game'
): string => {
  const { data } = useQuery({
    queryKey: ['atomLabel', atomId, network],
    queryFn: () => fetchAtomDetails(atomId!, network),
    enabled: Boolean(atomId) && !atomId!.startsWith('<'),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return data?.label || fallback;
};
