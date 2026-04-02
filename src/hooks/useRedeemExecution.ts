import { useRedeemBatch } from './useRedeemBatch';

interface UseRedeemExecutionProps {
  walletConnected?: any;
  walletAddress?: string;
}

export const useRedeemExecution = ({ walletConnected, walletAddress }: UseRedeemExecutionProps) => {
  const { redeemBatch, isLoading } = useRedeemBatch({
    walletConnected,
    walletAddress,
  });

  const handleRedeemAllSelected = async (
    positions: any[],
    selectedPositions: Set<string>,
    redeemAmounts: Record<string, number>,
    accountId: string
  ) => {
    if (selectedPositions.size === 0) return;

    const selectedPositionsData = positions.filter(p => selectedPositions.has(p.id));

    try {
      // Préparer les données pour le batch redeem
      const termIds: `0x${string}`[] = [];
      const curveIds: bigint[] = [];
      const shares: bigint[] = [];
      const minAssets: bigint[] = [];

      for (const position of selectedPositionsData) {
        const redeemAmount = redeemAmounts[position.id] || position.shares;
        const curveId = position.curve_id;
        termIds.push(position.term.id as `0x${string}`);
        curveIds.push(BigInt(curveId));
        shares.push(BigInt(redeemAmount));
        minAssets.push(BigInt(0)); // Min assets par défaut
      }

      // Exécuter le batch redeem
      await redeemBatch({
        receiver: accountId as `0x${string}`,
        termIds,
        curveIds,
        shares,
        minAssets,
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error redeeming selected positions:', error);

      const isRejected =
        error?.name === 'UserRejectedRequestError' ||
        (error?.message ?? '').toLowerCase().includes('user rejected') ||
        (error?.shortMessage ?? '').toLowerCase().includes('user rejected');

      return { success: false, error: isRejected ? 'User rejected the request.' : (error?.shortMessage ?? error?.message ?? String(error)) };
    }
  };

  return {
    handleRedeemAllSelected,
    isLoading
  };
};
