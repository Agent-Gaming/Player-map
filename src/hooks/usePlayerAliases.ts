import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Network } from './useAtomData';
import { PlayerAlias } from '../types/alias';
import { fetchAliasesByWalletPosition } from '../api/fetchPlayerAliases';
import { PREDICATES } from '../utils/constants';

interface UsePlayerAliasesProps {
  walletAddress?: string;
  network?: Network;
}

export const usePlayerAliases = ({
  walletAddress,
  network = Network.MAINNET,
}: UsePlayerAliasesProps) => {
  const predicateId = PREDICATES.HAS_ALIAS;

  // Single query: find has-alias triples where this wallet has a position.
  // subject_id of the triple = account atom term_id (playerAtomId).
  const { data: rawAliases, isLoading, error } = useQuery({
    queryKey: ['aliasesByPosition', walletAddress, predicateId, network],
    queryFn: () => fetchAliasesByWalletPosition(walletAddress!, predicateId, network),
    enabled: Boolean(walletAddress),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });

  const aliases: PlayerAlias[] = useMemo(() => {
    if (!rawAliases?.length) return [];
    const sorted = [...rawAliases].sort((a, b) =>
      b.userPosition > a.userPosition ? 1 : b.userPosition < a.userPosition ? -1 : 0
    );
    return sorted.map((a, i) => ({ ...a, isPrimary: i === 0 }));
  }, [rawAliases]);

  // playerAtomId = subject_id shared by all has-alias triples of this wallet
  const playerAtomId = rawAliases?.[0]?.subjectId ?? null;

  return {
    aliases,
    primaryAlias: aliases.find(a => a.isPrimary) ?? null,
    playerAtomId,
    isLoading,
    error: error as Error | null,
  };
};
