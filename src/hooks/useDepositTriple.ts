import { VoteDirection, DepositResponse } from "../types/vote";
import { UNIT_VALUE } from "../utils/constants";
import { ATOM_CONTRACT_ADDRESS, atomABI } from "../abi";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Network, API_URLS } from "./useAtomData";
import { apiCache } from "../utils/apiCache";

interface UseDepositTripleProps {
  walletConnected?: any;
  walletAddress?: string;
  publicClient?: any;
  network?: Network;
}

export const useDepositTriple = ({
  walletConnected,
  walletAddress,
  publicClient,
  network = Network.MAINNET,
}: UseDepositTripleProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  // Helper function to fetch triple details via GraphQL
  const fetchTripleDetails = async (tripleId: string) => {
    try {
      const apiUrl = API_URLS[network];

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query Triple($tripleId: String!) {
              triple(term_id: $tripleId) {
                term_id
                counter_term_id
              }
            }
          `,
          variables: { tripleId: String(tripleId) },
        }),
      });


      if (!response.ok) {
        return null;
      }

      const result = await response.json();

      if (result.errors) {
        console.error("❌ GraphQL errors:", result.errors);
        return null;
      }

      if (!result.data?.triple) {
        console.error("❌ No triple data found");
        return null;
      }

      // Return triple data
      return {
        id: String(tripleId),
        ...result.data.triple
      };
    } catch (error) {
      console.error("❌ fetchTripleDetails error:", error);
      return null;
    }
  };

  // Function to deposit stake on a triple (one transaction per vote)
  const depositTriple = async (
    votes: Array<{
      claimId: string;
      units: number;
      direction: VoteDirection;
    }>
  ): Promise<DepositResponse> => {
    if (!walletConnected || !walletAddress) {
      return {
        success: false,
        error: "Wallet not connected",
      };
    }

    if (votes.length === 0) {
      return {
        success: false,
        error: "No votes provided",
      };
    }

    // Validate each vote
    for (const vote of votes) {
      if (vote.units <= 0) {
        return {
          success: false,
          error: "Units must be greater than 0",
        };
      }
    }

    setIsLoading(true);

    try {
      // Arrays pour le batch
      const termIds: `0x${string}`[] = [];
      const curveIds: bigint[] = [];
      const assets: bigint[] = [];
      const minShares: bigint[] = [];

      // Traiter chaque vote
      for (const vote of votes) {
        // Get triple details
        const tripleDetails = await fetchTripleDetails(vote.claimId);
        if (!tripleDetails) {
          setIsLoading(false);
          return {
            success: false,
            error: `Failed to fetch triple details for claim ${vote.claimId}`,
          };
        }

        // Determine which ID to use based on vote direction
        let targetId: string;
        if (vote.direction === VoteDirection.For) {
          if (!tripleDetails.term_id) {
            console.error("❌ term_id is undefined for FOR vote");
            return { success: false, error: "term_id not found" };
          }
          targetId = tripleDetails.term_id;
        } else {
          if (!tripleDetails.counter_term_id) {
            console.error("❌ counter_term_id is undefined for AGAINST vote");
            return { success: false, error: "counter_term_id not found" };
          }
          targetId = tripleDetails.counter_term_id;
        }

        // Validate targetId
        if (!targetId) {
          console.error("❌ targetId is undefined");
          return { success: false, error: "targetId not found" };
        }

        // Calculate value in wei
        const calculation = Number(UNIT_VALUE) * vote.units;
        const roundedCalculation = Math.round(calculation);
        // Direct calculation like in vote/ClaimItem.tsx
        const depositValue = BigInt(roundedCalculation);

        // Add to arrays
        termIds.push(targetId as `0x${string}`);
        curveIds.push(1n);
        assets.push(depositValue);
        minShares.push(0n);
      }

      // Call depositBatch function
      const txHash = await walletConnected.writeContract({
        address: ATOM_CONTRACT_ADDRESS,
        abi: atomABI,
        functionName: "depositBatch",
        args: [
          walletAddress,  // receiver
          termIds,        // termIds array
          curveIds,       // curveIds array
          assets,         // assets array
          minShares       // minShares array
        ],
        value: assets.reduce((sum, asset) => sum + asset, 0n), // Total value
        gas: 500000n * BigInt(votes.length) // Gas based on number of votes
      });

      // Wait for confirmation
      let receipt;
      if (walletConnected.waitForTransactionReceipt) {
        receipt = await walletConnected.waitForTransactionReceipt({ hash: txHash });
      } else if (txHash.wait) {
        receipt = await txHash.wait();
      } else {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      setIsLoading(false);

      // Invalider les caches pour forcer le rechargement des positions et de l'activité
      apiCache.clear();
      await queryClient.invalidateQueries({ queryKey: ['positions'] });
      await queryClient.invalidateQueries({ queryKey: ['claimsBySubject'] });
      await queryClient.invalidateQueries({ queryKey: ['activityHistory'] });

      return {
        success: true,
        hash: typeof txHash === "string" ? txHash : txHash.hash,
      };
    } catch (error) {
      setIsLoading(false);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };

  return {
    depositTriple,
    isLoading
  };
}; 