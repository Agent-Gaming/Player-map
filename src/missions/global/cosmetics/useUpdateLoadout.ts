import { useMutation, useQueryClient } from '@tanstack/react-query';
import { putLoadout, type CosmeticSlot } from './cosmeticsLoadoutApi';
import { CosmeticsError } from '../archetype/hooks/cosmeticsApi';

interface UseUpdateLoadoutProps {
  address?: string;
  getAccessToken?: () => Promise<string | null>;
}

export function useUpdateLoadout({ address, getAccessToken }: UseUpdateLoadoutProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ slot, itemId }: { slot: CosmeticSlot; itemId: string | null }) => {
      if (!getAccessToken) {
        throw new CosmeticsError(401, 'No auth available for this host');
      }
      return putLoadout(address!, slot, itemId, getAccessToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cosmeticsLoadout', address] });
      queryClient.invalidateQueries({ queryKey: ['cosmeticsLibrary', address] });
    },
  });

  return {
    updateLoadout: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    reset: mutation.reset,
  };
}
