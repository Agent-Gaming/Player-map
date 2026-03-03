import React, { useState, useEffect } from "react";
import {
  convertSharesToTTRUST,
  formatLargeNumber,
} from "../../utils/conversionUtils";
import RedeemConfig from "./RedeemConfig";
import RedeemSelector from "./RedeemSelector";
import { TripleBubble, AtomBubble, PositionBubble } from "./index";
import { ATOM_CONTRACT_ADDRESS, atomABI } from "../../abi";
import SafeImage from "../SafeImage";
import upSvg from "../../assets/img/up.svg";
import downSvg from "../../assets/img/down.svg";
import upNotSelectedSvg from "../../assets/img/upNotSelected.svg";
import downNotSelectedSvg from "../../assets/img/downNotSelected.svg";

interface InfoRowProps {
  label: string;
  value: string | number | undefined;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => (
  <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
    <span style={{ color: "#ffd429", fontWeight: 700, minWidth: 110 }}>
      {label}:
    </span>
    <span style={{ color: "#fff" }}>{value || "N/A"}</span>
  </div>
);

interface AtomImageProps {
  src?: string;
  alt?: string;
}

const AtomImage: React.FC<AtomImageProps> = ({ src, alt }) => (
  <SafeImage
    src={src}
    alt={alt}
    style={{
      width: 48,
      height: 48,
      borderRadius: "50%",
      objectFit: "cover",
      boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
      marginRight: 10,
    }}
    placeholderText="?"
    showPlaceholder={true}
  />
);

interface PositionCardProps {
  position: any;
  isSelected?: boolean;
  onSelect?: (positionId: string, selected: boolean) => void;
  onAmountChange?: (positionId: string, amount: number) => void;
  redeemAmount?: number;
  publicClient?: any;
}

const PositionCard: React.FC<PositionCardProps> = ({
  position,
  isSelected = false,
  onSelect,
  onAmountChange,
  redeemAmount = 0,
  publicClient,
}) => {
  const sharesBigInt =
    typeof position.shares === "string"
      ? BigInt(position.shares)
      : BigInt(position.shares || 0);
  const term = position.term;
  const [trustAmount, setTrustAmount] = useState<string | null>(null);
  const [isLoadingTrust, setIsLoadingTrust] = useState(false);
  const [termValue, setTermValue] = useState<string | null>(null);
  const [isLoadingTermValue, setIsLoadingTermValue] = useState(false);
  
  // Determine if this is For or Against based on vault type
  const hasDeposits =
    position.vault?.deposits && position.vault.deposits.length > 0;
  const hasRedemptions =
    position.vault?.redemptions && position.vault.redemptions.length > 0;
  const depositType = position.vault?.deposits?.[0]?.vault_type;
  const redemptionType = position.vault?.redemptions?.[0]?.vault_type;
  
  // Determine For/Against based on vault type and shares
  const isFor =
    sharesBigInt > 0n &&
    (depositType === "Triple" ||
      depositType === "Atom" ||
      redemptionType === "Triple" ||
      redemptionType === "Atom");
  const isAgainst =
    sharesBigInt > 0n &&
    (depositType === "CounterTriple" ||
      depositType === "CounterAtom" ||
      redemptionType === "CounterTriple" ||
      redemptionType === "CounterAtom");
  
  // Get the active term based on the position
  const isAtomActivity = !term?.triple; // If no triple, it's an atom activity
  const activeTerm = isAtomActivity
    ? term
    : isFor
    ? term
    : term?.triple?.counter_term;
  const positionType = isFor ? "For" : "Against";
  
  // Get position description components for visual display
  const getPositionComponents = () => {
    if (
      activeTerm?.triple?.subject?.label &&
      activeTerm?.triple?.predicate?.label &&
      activeTerm?.triple?.object?.label
    ) {
      // Triple position - return components for visual display
      return {
        type: "triple",
        subject: activeTerm.triple.subject.label,
        predicate: activeTerm.triple.predicate.label,
        object: activeTerm.triple.object.label,
      };
    } else if (activeTerm?.atom?.label) {
      // Atom position
      return {
        type: "atom",
        label: activeTerm.atom.label,
      };
    }
    return { type: "unknown" };
  };
  
  // Convert shares to TTRUST percentage - use the correct term for calculation
  const calculationTerm = isAtomActivity
    ? term
    : isFor
    ? term
    : term?.triple?.counter_term;

  // Calculate TRUST amount using previewRedeem to get the amount after fees
  useEffect(() => {
    const calculateTrustAmount = async () => {
      if (
        !publicClient ||
        !ATOM_CONTRACT_ADDRESS ||
        !sharesBigInt ||
        sharesBigInt === 0n ||
        !calculationTerm?.id
      ) {
        setTrustAmount(null);
        return;
      }

      try {
        setIsLoadingTrust(true);
        const termId = calculationTerm.id;
        const curveId = position.curve_id || 1;

        // First, get the gross amount using convertToAssets
        const grossAssets = await publicClient.readContract({
          address: ATOM_CONTRACT_ADDRESS as `0x${string}`,
          abi: atomABI,
          functionName: "convertToAssets",
          args: [termId as `0x${string}`, BigInt(curveId), sharesBigInt],
        });

        // Calculate fees manually (previewRedeem doesn't work, so we use manual calculation)
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

        // Note: atomWalletDepositFee is a deposit fee, not a redeem fee
        // Based on testing, atomWalletDepositFee appears to be deducted elsewhere (possibly in convertToAssets)
        // Therefore, we only deduct exitFee and protocolFee for redeems
        // Calculate net amount after fees: grossAssets - exitFee - protocolFee
        const assetsAfterFees = grossAssets - exitFee - protocolFee;

        // Convert from wei to TRUST (divide by 1e18)
        const trustAmountNum = Number(assetsAfterFees) / 1e18;

        // Format the amount
        if (trustAmountNum >= 1e6) {
          setTrustAmount(`${(trustAmountNum / 1e6).toFixed(2)}M TRUST`);
        } else if (trustAmountNum >= 1e3) {
          setTrustAmount(`${(trustAmountNum / 1e3).toFixed(2)}K TRUST`);
        } else if (trustAmountNum < 0.0001) {
          setTrustAmount(`< 0.0001 TRUST`);
        } else {
          setTrustAmount(`${trustAmountNum.toFixed(4)} TRUST`);
        }
      } catch (error) {
        console.error("Error calculating TRUST amount:", error);
        setTrustAmount(null);
      } finally {
        setIsLoadingTrust(false);
      }
    };

    calculateTrustAmount();
  }, [publicClient, sharesBigInt, calculationTerm?.id, position.curve_id]);

  // Calculate Term Value in TRUST (using total_market_cap which is already in assets/wei)
  useEffect(() => {
    const calculateTermValue = async () => {
      if (!calculationTerm?.id || !calculationTerm?.total_market_cap) {
        setTermValue(null);
        return;
      }

      try {
        setIsLoadingTermValue(true);
        // total_market_cap is already in assets (wei), not in shares
        // total_assets is in shares, so we use total_market_cap instead
        // Convert directly from wei to TRUST (divide by 1e18) - NO fees deducted for term value
        const totalMarketCapBigInt = BigInt(calculationTerm.total_market_cap);
        const termValueNum = Number(totalMarketCapBigInt) / 1e18;

        // Format the amount (same as trustAmount)
        if (termValueNum >= 1e6) {
          setTermValue(`${(termValueNum / 1e6).toFixed(2)}M TRUST`);
        } else if (termValueNum >= 1e3) {
          setTermValue(`${(termValueNum / 1e3).toFixed(2)}K TRUST`);
        } else if (termValueNum < 0.0001) {
          setTermValue(`< 0.0001 TRUST`);
        } else {
          setTermValue(`${termValueNum.toFixed(4)} TRUST`);
        }
      } catch (error) {
        console.error("Error calculating Term Value:", error);
        setTermValue(null);
      } finally {
        setIsLoadingTermValue(false);
      }
    };

    calculateTermValue();
  }, [calculationTerm?.id, calculationTerm?.total_market_cap]);
  
  // Determine the action type (deposit or redeem)
  const getActionType = () => {
    if (hasDeposits && hasRedemptions) {
      // This shouldn't happen, but if it does, prioritize based on shares
      return sharesBigInt > 0n ? "Deposit" : "Redeem";
    } else if (hasDeposits) {
      return "Deposit";
    } else if (hasRedemptions) {
      return "Redeem";
    }
    return "Unknown";
  };

  // Determine if this is a redeem action
  const isRedeem = getActionType() === "Redeem";
  
  // Get the vault type from deposits or redemptions
  const getVaultType = () => {
    // Prioritize deposit type if available, otherwise redemption type
    if (hasDeposits && depositType) {
      return depositType;
    } else if (hasRedemptions && redemptionType) {
      return redemptionType;
    }
    return "Unknown";
  };

  // Vote counts — term = vault où le joueur est positionné
  const forCount = isFor
    ? (term?.positions_aggregate?.aggregate?.count ?? 0)
    : 0;
  const againstCount = isAgainst
    ? (term?.positions_aggregate?.aggregate?.count ?? 0)
    : (term?.triple?.counter_term?.positions_aggregate?.aggregate?.count ?? 0);

  // Subject / predicate / object labels + images
  const positionComponents = getPositionComponents();
  const subjectLabel =
    positionComponents.type === "triple" ? positionComponents.subject : null;
  const predicateLabel =
    positionComponents.type === "triple" ? positionComponents.predicate : null;
  const objectLabel =
    positionComponents.type === "triple"
      ? positionComponents.object
      : positionComponents.type === "atom"
      ? positionComponents.label
      : "Unknown";
  const subjectImage = activeTerm?.triple?.subject?.image;
  const objectImage = activeTerm?.triple?.object?.image;

  return (
    <div
      style={{
        padding: "10px 0",
        marginBottom: "2px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
      }}
    >
      {/* Triple / Atom display */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "5px",
          flex: 1,
          minWidth: 0,
        }}
      >
        {positionComponents.type === "triple" && subjectLabel ? (
          <>
            {/* Subject pill */}
            <div
              title={subjectLabel}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                maxWidth: "140px",
                backgroundColor: "#1a1a1adc",
                padding: "6px 10px",
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              {subjectImage && (
                <img
                  src={subjectImage}
                  alt=""
                  style={{ width: 16, height: 16, borderRadius: "50%", flexShrink: 0, objectFit: "cover" }}
                />
              )}
              <span style={{ fontSize: "0.82em", color: "#D9D9D9", fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {subjectLabel}
              </span>
            </div>

            {/* Predicate */}
            <span
              title={predicateLabel}
              style={{
                display: "inline-block",
                maxWidth: "90px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontSize: "0.82em",
                color: "#D9D9D9",
                fontWeight: "bold",
              }}
            >
              {predicateLabel}
            </span>

            {/* Object pill */}
            <div
              title={objectLabel}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                maxWidth: "140px",
                backgroundColor: "#1a1a1adc",
                padding: "6px 10px",
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              {objectImage && (
                <img
                  src={objectImage}
                  alt=""
                  style={{ width: 16, height: 16, borderRadius: "50%", flexShrink: 0, objectFit: "cover" }}
                />
              )}
              <span style={{ fontSize: "0.82em", color: "#D9D9D9", fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {objectLabel}
              </span>
            </div>
          </>
        ) : (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              backgroundColor: "#1a1a1adc",
              padding: "6px 10px",
              borderRadius: "4px",
              overflow: "hidden",
              maxWidth: "100%",
            }}
          >
            <span style={{ fontSize: "0.82em", color: "#D9D9D9", fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {objectLabel}
            </span>
          </div>
        )}
      </div>

      {/* Vote display + Redeem */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
        {/* FOR */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <img
            src={isFor ? upSvg : upNotSelectedSvg}
            alt="up"
            style={{ width: 28, height: 28 }}
          />
          <span
            style={{
              color: isFor ? "#006FE8" : "rgba(255,255,255,0.5)",
              fontWeight: "bold",
              fontSize: "1.1em",
              minWidth: "20px",
            }}
          >
            {forCount}
          </span>
        </div>

        {/* AGAINST */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <img
            src={!isFor ? downSvg : downNotSelectedSvg}
            alt="down"
            style={{ width: 28, height: 28 }}
          />
          <span
            style={{
              color: !isFor ? "#FF9500" : "rgba(255,255,255,0.5)",
              fontWeight: "bold",
              fontSize: "1.1em",
              minWidth: "20px",
            }}
          >
            {againstCount}
          </span>
        </div>

        {/* Redeem */}
        <RedeemSelector
          isSelected={isSelected}
          onSelect={onSelect || (() => {})}
          positionId={position.id}
        />
        {isSelected && onAmountChange && (
          <RedeemConfig
            positionId={position.id}
            shares={Number(sharesBigInt)}
            redeemAmount={redeemAmount}
            onAmountChange={onAmountChange}
            publicClient={publicClient}
            termId={calculationTerm?.id}
            curveId={position.curve_id || 1}
          />
        )}
      </div>
    </div>
  );
};

export default PositionCard;
