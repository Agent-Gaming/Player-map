import { useQuery } from '@tanstack/react-query';
import { Network } from './useAtomData';
import { fetchAtomDetails, AtomDetails } from '../api/fetchAtomDetails';

interface SelectedAtomData {
  atomDetails: AtomDetails | null;
  loading: boolean;
  error: string | null;
}

export const useSelectedAtomData = (
  selectedNode: any,
  network: Network = Network.MAINNET
): SelectedAtomData => {
  const { data, isLoading, error, isError } = useQuery({
    queryKey: ['atomDetails', selectedNode?.id, network],
    queryFn: () => fetchAtomDetails(selectedNode!.id, network),
    enabled: Boolean(selectedNode?.id), // Ne fetch que si selectedNode existe
    staleTime: 5 * 60 * 1000, // Cache 5 minutes (données moins volatiles)
    gcTime: 10 * 60 * 1000,   // Garde en mémoire 10 minutes
    retry: 1,
  });

  return {
    atomDetails: data || null,
    loading: isLoading,
    error: isError ? (error as Error).message : null
  };
};
