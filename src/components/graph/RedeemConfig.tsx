import React, { useState, useEffect } from "react";
import { ATOM_CONTRACT_ADDRESS, atomABI } from "../../abi";

interface RedeemConfigProps {
  positionId: string;
  shares: number;
  redeemAmount: number;
  onAmountChange: (positionId: string, amount: number) => void;
  publicClient?: any;
  termId?: string;
  curveId?: number;
}

const RedeemConfig: React.FC<RedeemConfigProps> = ({
  positionId,
  shares,
  redeemAmount,
  onAmountChange,
  publicClient,
  termId,
  curveId = 1,
}) => {
  const [maxTrustAmount, setMaxTrustAmount] = useState<string | null>(null);
  const [isLoadingMaxTrust, setIsLoadingMaxTrust] = useState(false);
  const [redeemAmountTrustNum, setRedeemAmountTrustNum] = useState<
    number | null
  >(null);
  const [isLoadingRedeemTrust, setIsLoadingRedeemTrust] = useState(false);

  // Calculate max TRUST amount (shares converted to TRUST with fees deducted)
  useEffect(() => {
    const calculateMaxTrustAmount = async () => {
      if (
        !publicClient ||
        !ATOM_CONTRACT_ADDRESS ||
        !termId ||
        !shares ||
        shares === 0
      ) {
        setMaxTrustAmount(null);
        return;
      }

      try {
        setIsLoadingMaxTrust(true);
        const sharesBigInt = BigInt(shares);

        // First, get the gross amount using convertToAssets
        const grossAssets = await publicClient.readContract({
          address: ATOM_CONTRACT_ADDRESS as `0x${string}`,
          abi: atomABI,
          functionName: "convertToAssets",
          args: [termId as `0x${string}`, BigInt(curveId), sharesBigInt],
        });

        // Get vault fees (exitFee + protocolFee)
        const vaultFees = await publicClient.readContract({
          address: ATOM_CONTRACT_ADDRESS as `0x${string}`,
          abi: atomABI,
          functionName: "getVaultFees",
          args: [],
        });

        // vaultFees returns [entryFee, exitFee, protocolFee] or { entryFee, exitFee, protocolFee }
        const vaultFeesArray = Array.isArray(vaultFees)
          ? vaultFees
          : [vaultFees.entryFee, vaultFees.exitFee, vaultFees.protocolFee];
        const exitFeeRate = vaultFeesArray[1];
        const protocolFeeRate = vaultFeesArray[2];
        const feeDenominator = BigInt(10000); // Standard fee denominator

        // Calculate exit fee: grossAssets * exitFeeRate / feeDenominator
        const exitFee = (grossAssets * BigInt(exitFeeRate)) / feeDenominator;

        // Calculate protocol fee: grossAssets * protocolFeeRate / feeDenominator
        const protocolFee =
          (grossAssets * BigInt(protocolFeeRate)) / feeDenominator;

        // Calculate net amount after fees: grossAssets - exitFee - protocolFee
        const assetsAfterFees = grossAssets - exitFee - protocolFee;

        // Convert from wei to TRUST (divide by 1e18)
        const trustAmountNum = Number(assetsAfterFees) / 1e18;

        // Format the amount
        if (trustAmountNum >= 1e6) {
          setMaxTrustAmount(`${(trustAmountNum / 1e6).toFixed(2)}M TRUST`);
        } else if (trustAmountNum >= 1e3) {
          setMaxTrustAmount(`${(trustAmountNum / 1e3).toFixed(2)}K TRUST`);
        } else if (trustAmountNum < 0.0001) {
          setMaxTrustAmount(`< 0.0001 TRUST`);
        } else {
          setMaxTrustAmount(`${trustAmountNum.toFixed(4)} TRUST`);
        }
      } catch (error) {
        console.error("Error calculating max TRUST amount:", error);
        setMaxTrustAmount(null);
      } finally {
        setIsLoadingMaxTrust(false);
      }
    };

    calculateMaxTrustAmount();
  }, [publicClient, termId, curveId, shares]);

  // Calculate redeem amount in TRUST (with fees deducted)
  useEffect(() => {
    const calculateRedeemTrustAmount = async () => {
      if (
        !publicClient ||
        !ATOM_CONTRACT_ADDRESS ||
        !termId ||
        !redeemAmount ||
        redeemAmount === 0
      ) {
        setRedeemAmountTrustNum(null);
        return;
      }

      try {
        setIsLoadingRedeemTrust(true);
        const redeemSharesBigInt = BigInt(redeemAmount);

        // First, get the gross amount using convertToAssets
        const grossAssets = await publicClient.readContract({
          address: ATOM_CONTRACT_ADDRESS as `0x${string}`,
          abi: atomABI,
          functionName: "convertToAssets",
          args: [termId as `0x${string}`, BigInt(curveId), redeemSharesBigInt],
        });

        // Get vault fees (exitFee + protocolFee)
        const vaultFees = await publicClient.readContract({
          address: ATOM_CONTRACT_ADDRESS as `0x${string}`,
          abi: atomABI,
          functionName: "getVaultFees",
          args: [],
        });

        // vaultFees returns [entryFee, exitFee, protocolFee] or { entryFee, exitFee, protocolFee }
        const vaultFeesArray = Array.isArray(vaultFees)
          ? vaultFees
          : [vaultFees.entryFee, vaultFees.exitFee, vaultFees.protocolFee];
        const exitFeeRate = vaultFeesArray[1];
        const protocolFeeRate = vaultFeesArray[2];
        const feeDenominator = BigInt(10000); // Standard fee denominator

        // Calculate exit fee: grossAssets * exitFeeRate / feeDenominator
        const exitFee = (grossAssets * BigInt(exitFeeRate)) / feeDenominator;

        // Calculate protocol fee: grossAssets * protocolFeeRate / feeDenominator
        const protocolFee =
          (grossAssets * BigInt(protocolFeeRate)) / feeDenominator;

        // Calculate net amount after fees: grossAssets - exitFee - protocolFee
        const assetsAfterFees = grossAssets - exitFee - protocolFee;

        // Convert from wei to TRUST (divide by 1e18)
        const trustAmountNum = Number(assetsAfterFees) / 1e18;
        setRedeemAmountTrustNum(trustAmountNum);
      } catch (error) {
        console.error("Error calculating redeem TRUST amount:", error);
        setRedeemAmountTrustNum(null);
      } finally {
        setIsLoadingRedeemTrust(false);
      }
    };

    calculateRedeemTrustAmount();
  }, [publicClient, termId, curveId, redeemAmount]);

  // Convert TRUST input to shares for transaction
  // Reverse the fee calculation: TRUST (after fees) → assets (after fees) → assets (before fees) → shares
  const handleTrustInputChange = async (trustValue: number) => {
    if (!publicClient || !ATOM_CONTRACT_ADDRESS || !termId) {
      return;
    }

    try {
      // Get vault fees to calculate the reverse
      const vaultFees = await publicClient.readContract({
        address: ATOM_CONTRACT_ADDRESS as `0x${string}`,
        abi: atomABI,
        functionName: "getVaultFees",
        args: [],
      });

      const vaultFeesArray = Array.isArray(vaultFees)
        ? vaultFees
        : [vaultFees.entryFee, vaultFees.exitFee, vaultFees.protocolFee];
      const exitFeeRate = vaultFeesArray[1];
      const protocolFeeRate = vaultFeesArray[2];
      const feeDenominator = BigInt(10000);

      // Convert TRUST to assets (wei) - this is the amount after fees
      const assetsAfterFees = BigInt(Math.floor(trustValue * 1e18));

      // Calculate gross assets (before fees): assetsAfterFees / (1 - exitFeeRate - protocolFeeRate)
      // But we need to work with BigInt, so we calculate: grossAssets = assetsAfterFees * feeDenominator / (feeDenominator - exitFeeRate - protocolFeeRate)
      const totalFeeRate = BigInt(exitFeeRate) + BigInt(protocolFeeRate);
      const netFeeDenominator = feeDenominator - totalFeeRate;
      const grossAssets =
        (assetsAfterFees * feeDenominator) / netFeeDenominator;

      // Convert assets to shares using convertToShares
      const calculatedShares = await publicClient.readContract({
        address: ATOM_CONTRACT_ADDRESS as `0x${string}`,
        abi: atomABI,
        functionName: "convertToShares",
        args: [termId as `0x${string}`, BigInt(curveId), grossAssets],
      });

      // Clamp to max shares
      const finalShares = Math.min(Number(calculatedShares), shares);
      onAmountChange(positionId, finalShares);
    } catch (error) {
      console.error("Error converting TRUST to shares:", error);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "6px",
        minWidth: "200px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          width: "100%",
        }}
      >
        <input
          type="number"
          value={
            isLoadingRedeemTrust
              ? ""
              : redeemAmountTrustNum !== null
              ? redeemAmountTrustNum.toFixed(4)
              : redeemAmount || 0
          }
          onChange={(e) => {
            const trustValue = parseFloat(e.target.value) || 0;
            handleTrustInputChange(trustValue);
          }}
          placeholder={isLoadingRedeemTrust ? "Loading..." : "0.0000"}
          min={0}
          step="0.0001"
          style={{
            width: "100%",
            padding: "4px 8px",
            borderRadius: "4px",
            border: "1px solid #374151",
            backgroundColor: "#232326",
            color: "#fff",
            fontSize: "12px",
          }}
        />
        <p style={{ color: "#9ca3af", fontSize: "10px" }}>
          Max: {isLoadingMaxTrust ? "Loading..." : maxTrustAmount || "N/A"}
        </p>

        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          {[
            { label: "25%", multiplier: 0.25 },
            { label: "50%", multiplier: 0.5 },
            { label: "75%", multiplier: 0.75 },
            { label: "Max", multiplier: 1 },
          ].map(({ label, multiplier }) => (
            <button
              key={label}
              onClick={() => {
                // Calculate percentage of shares (linear)
                // The TRUST display will be calculated automatically via useEffect
                // Since fees are proportional, X% of shares = X% of TRUST (both gross and net)
                onAmountChange(positionId, shares * multiplier);
              }}
              style={{
                padding: "0px 4px",
                borderRadius: "4px",
                border: "1px solid #374151",
                backgroundColor: "#232326",
                color: "#fff",
                fontSize: "12px",
                cursor: "pointer",
                minWidth: "32px",
                textAlign: "center",
                height: "20px",
                lineHeight: "20px",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RedeemConfig;
