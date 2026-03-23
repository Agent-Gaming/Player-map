import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Network } from './useAtomData';
import { DefaultPlayerMapConstants } from '../types/PlayerMapConfig';
import { PlayerAlias } from '../types/alias';
import {
  fetchPlayerAtomByAddress,
  fetchAliasTriplesWithPosition,
} from '../api/fetchPlayerAliases';

interface UsePlayerAliasesProps {
  walletAddress?: string;
  constants: DefaultPlayerMapConstants;
  network?: Network;
}

export const usePlayerAliases = ({
  walletAddress,
  constants,
  network = Network.MAINNET,
}: UsePlayerAliasesProps) => {
  const predicateId = constants.HAS_ALIAS_PREDICATE_ID;

  // Query 1: resolve the player's atom term_id
  const { data: playerAtomId, isLoading: isLoadingAtom } = useQuery({
    queryKey: ['playerAtom', walletAddress, network],
    queryFn: () => fetchPlayerAtomByAddress(walletAddress!, network),
    enabled: Boolean(walletAddress),
    staleTime: 10 * 60 * 1000, // 10 min — player atom rarely changes
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  // Query 2: fetch alias triples — only runs once playerAtomId is resolved
  const { data: rawAliases, isLoading: isLoadingAliases, error } = useQuery({
    queryKey: ['playerAliases', playerAtomId, walletAddress, predicateId, network],
    queryFn: () =>
      fetchAliasTriplesWithPosition(playerAtomId!, walletAddress!, predicateId, network),
    enabled: Boolean(playerAtomId && walletAddress),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Compute aliases sorted by userPosition desc; first entry is primary
  const aliases: PlayerAlias[] = useMemo(() => {
    if (!rawAliases?.length) return [];
    const sorted = [...rawAliases].sort((a, b) =>
      b.userPosition > a.userPosition ? 1 : b.userPosition < a.userPosition ? -1 : 0
    );
    return sorted.map((a, i) => ({ ...a, isPrimary: i === 0 }));
  }, [rawAliases]);

  return {
    aliases,
    primaryAlias: aliases.find(a => a.isPrimary) ?? null,
    // playerAtomId is the term_id (hex string) of the player's existing atom
    playerAtomId: playerAtomId ?? null,
    // isLoading covers both queries: player atom fetch AND alias triples fetch
    isLoading: isLoadingAtom || isLoadingAliases,
    error: error as Error | null,
  };
};
