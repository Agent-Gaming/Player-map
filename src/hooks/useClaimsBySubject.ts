import { useQuery } from '@tanstack/react-query';
import { Network } from './useAtomData';
import { fetchClaimsBySubject } from '../api/fetchClaimsBySubject';


export const useClaimsBySubject = (
  subjectId: string | undefined,
  network: Network = Network.MAINNET
) => {
  const { data, isLoading, error, isError } = useQuery({
    queryKey: ['claimsBySubject', subjectId, network],
    queryFn: () => fetchClaimsBySubject(subjectId!, network),
    enabled: Boolean(subjectId), // Ne fetch que si subjectId existe
    staleTime: 2 * 60 * 1000, // Cache 2 minutes
    gcTime: 5 * 60 * 1000,    // Garde en mémoire 5 minutes
    retry: 1,
  });

  return {
    claims: data || [],
    loading: isLoading,
    error: isError ? (error as Error) : null,
  };
};
