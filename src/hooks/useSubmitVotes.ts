import { useState, useRef, useCallback } from "react";
import { VoteItem, VoteDirection, DepositResponse } from "../types/vote";
import { useDepositTriple } from "./useDepositTriple";
import { useRedeemBatch } from "./useRedeemBatch";
import { Network } from "./useAtomData";

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

      // Collect switch items: user had a position in the opposite direction
      const switchItems = votesToProcess.filter(
        item =>
          item.userHasPosition &&
          item.userPositionDirection !== VoteDirection.None &&
          item.userPositionDirection !== item.direction &&
          item.userPositionTermId &&
          item.userShares &&
          item.userShares > 0n
      );

      // Redeem existing opposite positions before depositing
      if (switchItems.length > 0) {
        await redeemBatch({
          receiver: walletAddress as `0x${string}`,
          termIds: switchItems.map(item => item.userPositionTermId as `0x${string}`),
          curveIds: switchItems.map(item => item.userCurveId ?? 1n),
          shares: switchItems.map(item => item.userShares!),
          minAssets: switchItems.map(() => 0n),
        });
      }

      const votes = votesToProcess.map(vote => ({
        claimId: `0x${vote.id.toString(16).padStart(64, '0')}`,
        units: vote.units,
        direction: vote.direction
      }));

      const result = await depositTriple(votes);

      if (result.success) {
        setTransactionStatusWithAutoDismiss({
          status: "success",
          message: `Transaction successful! Hash: ${result.hash?.substring(0, 10)}...`,
        });

        if (onSuccess) {
          onSuccess();
        }

        return result;
      } else {
        let errorMessage = result.error || "An error occurred.";

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