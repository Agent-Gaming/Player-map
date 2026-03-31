import React, { useState, useEffect } from "react";
import {
  convertSharesToTTRUST,
  formatLargeNumber,
} from "../../utils/conversionUtils";
import RedeemSelector from "./RedeemSelector";
import { TripleBubble, AtomBubble, PositionBubble } from "./index";
import { ATOM_CONTRACT_ADDRESS, atomABI } from "../../abi";
import SafeImage from "../SafeImage";
import styles from "./Positions.module.css";
import upSvg from "../../assets/img/up.svg";
import downSvg from "../../assets/img/down.svg";
import upNotSelectedSvg from "../../assets/img/upNotSelected.svg";
import downNotSelectedSvg from "../../assets/img/downNotSelected.svg";

interface InfoRowProps {
  label: string;
  value: string | number | undefined;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => (
  <div className={styles.infoRow}>
    <span className={styles.infoRowLabel}>
      {label}:
    </span>
    <span className={styles.infoRowValue}>{value || "N/A"}</span>
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
  const truncateId = (id?: string) =>
    id ? id.slice(0, 6) + '…' + id.slice(-4) : '?';

  const getPositionComponents = () => {
    if (activeTerm?.triple) {
      const t = activeTerm.triple;
      const inner = t._innerTriple ?? (!t.subject?.label && t.subject_term?.triple);
      if (!t.subject?.label && inner) {
        return {
          type: "triple",
          subject: inner.object?.label || truncateId(inner.object?.term_id),
          predicate: t.predicate?.label || truncateId(t.predicate_id),
          object: t.object?.label || truncateId(t.object?.term_id),
          objectImage: t.object?.image,
        };
      }
      return {
        type: "triple",
        subject: t.subject?.label || truncateId(t.subject_id),
        predicate: t.predicate?.label || truncateId(t.predicate_id),
        object: t.object?.label || truncateId(t.object?.term_id),
        objectImage: t.object?.image,
      };
    } else if (activeTerm?.atom) {
      return {
        type: "atom",
        label: activeTerm.atom.label || truncateId(activeTerm.atom.term_id),
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
  const objectImage = (positionComponents as any).objectImage ?? activeTerm?.triple?.object?.image;

  return (
    <div className={styles.cardRow}>
      {/* Triple / Atom display */}
      <div className={styles.tripleWrap}>
        {positionComponents.type === "triple" ? (
          <>
            <div title={subjectLabel} className={styles.pillSm}>
              {subjectImage && <img src={subjectImage} alt="" className={styles.pillSmImage} />}
              <span className={styles.pillSmLabel}>{subjectLabel}</span>
            </div>
            <span title={predicateLabel} className={styles.predicateText}>{predicateLabel}</span>
            <div title={objectLabel} className={styles.pillSm}>
              {objectImage && <img src={objectImage} alt="" className={styles.pillSmImage} />}
              <span className={styles.pillSmLabel}>{objectLabel}</span>
            </div>
          </>
        ) : (
          <div
            className={styles.pillSmFull}
          >
            <span className={styles.pillSmLabel}>
              {objectLabel}
            </span>
          </div>
        )}
      </div>

      {/* Vote display + Redeem */}
      <div className={styles.cardVoteGroup}>
        {/* FOR */}
        <div className={styles.cardVoteItem}>
          <img
            src={isFor ? upSvg : upNotSelectedSvg}
            alt="up"
            className={styles.cardVoteImg}
          />
          <span
            className={styles.cardVoteCount}
            style={{ color: isFor ? "#006FE8" : "rgba(255,255,255,0.5)" }}
          >
            {forCount}
          </span>
        </div>

        {/* AGAINST */}
        <div className={styles.cardVoteItem}>
          <img
            src={!isFor ? downSvg : downNotSelectedSvg}
            alt="down"
            className={styles.cardVoteImg}
          />
          <span
            className={styles.cardVoteCount}
            style={{ color: !isFor ? "#FF9500" : "rgba(255,255,255,0.5)" }}
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
      </div>
    </div>
  );
};

export default PositionCard;
