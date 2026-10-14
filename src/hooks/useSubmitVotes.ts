import { useState, useRef, useCallback } from "react";
import { VoteItem, VoteDirection, DepositResponse } from "../types/vote";
import { useDepositTriple } from "./useDepositTriple";
import { useRedeemBatch } from "./useRedeemBatch";
import { Network } from "./useAtomData";
import { UNIT_VALUE } from "../utils/constants";

// curve_id 1 (the only one this app deposits into) is a fixed 1:1 price
// curve — a position's shares directly approximate the units originally
// deposited (confirmed live against the subgraph: total_shares ==
// total_assets, current_share_price == 1e18 for this curve). Rounded to the
// nearest whole unit since share accounting can carry tiny rounding dust.
export function estimateHeldUnits(shares: bigint | undefined): number {
  if (!shares) return 0;
  return Math.round(Number(shares) / Number(UNIT_VALUE));
}

type TransactionStatus = {
  status: "idle" | "pending" | "success" | "error" | "approval_pending" | "whitelist_error";
  message: string;
};

interface UseSubmitVotesProps {
  walletConnected?: any;
  walletAddress?: string;
  publicClient?: any;
  network?: Network;
  onSuccess?: () => void;
}

export const useSubmitVotes = ({
  walletConnected,
  walletAddress,
  publicClient,
  network = Network.MAINNET,
  onSuccess
}: UseSubmitVotesProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus>({
    status: "idle",
    message: "",
  });
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setTransactionStatusWithAutoDismiss = useCallback((status: TransactionStatus) => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    setTransactionStatus(status);
    if (status.status === "success" || status.status === "error") {
      dismissTimerRef.current = setTimeout(() => {
        setTransactionStatus({ status: "idle", message: "" });
      }, 5000);
    }
  }, []);

  const { depositTriple, isLoading: isDepositLoading } = useDepositTriple({
    walletConnected,
    walletAddress,
    publicClient,
    network,
  });

  const { redeemBatch } = useRedeemBatch({ walletConnected, walletAddress });

  const submitVotes = async (voteItems: VoteItem[]) => {
    const hasVotes = voteItems.some((item) => item.units > 0);
    if (!hasVotes) {
      setTransactionStatusWithAutoDismiss({
        status: "error",
        message: "Please place at least one vote.",
      });
      return null;
    }

    if (!walletConnected || !walletAddress) {
      setTransactionStatusWithAutoDismiss({
        status: "error",
        message: "Wallet not connected.",
      });
      return null;
    }

    try {
      setIsSubmitting(true);

      setTransactionStatus({
        status: "pending",
        message: "Transaction in progress...",
      });

      const votesToProcess = voteItems.filter((item) => item.units > 0);

      const hasOwnPosition = (item: VoteItem) =>
        item.userHasPosition &&
        item.userPositionDirection !== VoteDirection.None &&
        !!item.userPositionTermId &&
        item.userShares !== undefined &&
        item.userShares > 0n;

      // Opposite direction (for ↔ against): full redeem of the old position,
      // full deposit of the new one.
      const switchItems = votesToProcess.filter(
        item => hasOwnPosition(item) && item.userPositionDirection !== item.direction
      );

      // Same direction, different intensity (weak ↔ strong): top up with
      // just the missing amount, or redeem just the excess — not a full
      // redeem-then-redeposit of the whole position.
      const sameDirectionItems = votesToProcess.filter(
        item => hasOwnPosition(item) && item.userPositionDirection === item.direction
      );

      const topUps: Array<{ item: VoteItem; deltaUnits: number }> = [];
      const partialRedeems: Array<{ item: VoteItem; sharesToRedeem: bigint }> = [];

      for (const item of sameDirectionItems) {
        const heldUnits = estimateHeldUnits(item.userShares);
        if (item.units > heldUnits) {
          topUps.push({ item, deltaUnits: item.units - heldUnits });
        } else if (item.units < heldUnits && heldUnits > 0) {
          // Proportional to the unit difference, not the whole position.
          const sharesToRedeem = (item.userShares! * BigInt(heldUnits - item.units)) / BigInt(heldUnits);
          if (sharesToRedeem > 0n) partialRedeems.push({ item, sharesToRedeem });
        }
      }

      // One batched redeem covers both "switching direction" (full) and
      // "lowering intensity in place" (partial).
      let redeemResult: Awaited<ReturnType<typeof redeemBatch>> | null = null;
      if (switchItems.length > 0 || partialRedeems.length > 0) {
        redeemResult = await redeemBatch({
          receiver: walletAddress as `0x${string}`,
          termIds: [
            ...switchItems.map(item => item.userPositionTermId as `0x${string}`),
            ...partialRedeems.map(({ item }) => item.userPositionTermId as `0x${string}`),
          ],
          curveIds: [
            ...switchItems.map(item => item.userCurveId ?? 1n),
            ...partialRedeems.map(({ item }) => item.userCurveId ?? 1n),
          ],
          shares: [
            ...switchItems.map(item => item.userShares!),
            ...partialRedeems.map(({ sharesToRedeem }) => sharesToRedeem),
          ],
          minAssets: [...switchItems, ...partialRedeems].map(() => 0n),
        });
      }

      // One batched deposit: a brand-new position or a direction switch
      // deposits its full units; raising intensity in place only deposits
      // the units missing on top of what's already held.
      const sameDirectionIds = new Set(sameDirectionItems.map(item => item.id));
      const depositVotes = [
        ...votesToProcess
          .filter(item => !sameDirectionIds.has(item.id))
          .map(vote => ({
            claimId: `0x${vote.id.toString(16).padStart(64, '0')}`,
            units: vote.units,
            direction: vote.direction,
          })),
        ...topUps.map(({ item, deltaUnits }) => ({
          claimId: `0x${item.id.toString(16).padStart(64, '0')}`,
          units: deltaUnits,
          direction: item.direction,
        })),
      ];

      const result = depositVotes.length > 0 ? await depositTriple(depositVotes) : redeemResult;

      if (result && result.success) {
        setTransactionStatusWithAutoDismiss({
          status: "success",
          message: `Transaction successful! Hash: ${result.hash?.substring(0, 10)}...`,
        });

        if (onSuccess) {
          onSuccess();
        }

        return result;
      } else {
        let errorMessage = (result && 'error' in result ? result.error : null) || "An error occurred.";

        if (errorMessage.includes("user rejected")) {
          setTransactionStatusWithAutoDismiss({
            status: "error",
            message: "Transaction cancelled: User rejected the request.",
          });
        } else {
          setTransactionStatusWithAutoDismiss({
            status: "error",
            message: `Error: ${errorMessage}`,
          });
        }

        return null;
      }
    } catch (error) {
      console.error("Error submitting votes:", error);
      setTransactionStatusWithAutoDismiss({
        status: "error",
        message: error instanceof Error ? error.message : "An error occurred.",
      });
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitVotes,
    isSubmitting,
    isDepositLoading,
    transactionStatus,
    setTransactionStatus
  };
}; 