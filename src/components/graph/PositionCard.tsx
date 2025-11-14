import React, { useState, useEffect } from "react";
import {
  convertSharesToTTRUST,
  formatLargeNumber,
} from "../../utils/conversionUtils";
import RedeemConfig from "./RedeemConfig";
import RedeemSelector from "./RedeemSelector";
import { TripleBubble, AtomBubble, PositionBubble } from "./index";
import { ATOM_CONTRACT_ADDRESS, atomABI } from "../../abi";

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

const AtomImage: React.FC<AtomImageProps> = ({ src, alt }) =>
  src ? (
    <img
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
    />
  ) : null;

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

  return (
    <div
      style={{
        background: "#232326",
        borderRadius: 14,
        padding: "18px 24px",
        marginBottom: 4,
        boxShadow: "0 2px 12px rgba(0,0,0,0.13)",
        borderLeft: `6px solid ${
          isRedeem ? "#FFD700" : isFor ? "#006FE8" : "#FF9500"
        }`,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
      className="position-card"
    >
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        <AtomImage
          src={position.account?.image}
          alt={position.account?.label}
        />
        <div style={{ flex: 1 }}>
          {/* Position avec bulles discrètes - sur une ligne */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
            }}
          >
            {(() => {
              const positionComponents = getPositionComponents();
              if (positionComponents.type === "triple") {
                return (
                  <TripleBubble
                    subject={positionComponents.subject}
                    predicate={positionComponents.predicate}
                    object={positionComponents.object}
                    fontSize="14px"
                  />
                );
              } else if (positionComponents.type === "atom") {
                return (
                  <AtomBubble
                    label={positionComponents.label}
                    fontSize="14px"
                  />
                );
              } else {
                return (
                  <span style={{ color: "#fff", fontSize: "14px" }}>
                    Unknown Position
                  </span>
                );
              }
            })()}
          </div>

          {/* Direction avec bulle For/Against - sur une ligne */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <span style={{ color: "#ffd429", fontWeight: 700, minWidth: 110 }}>
              Direction:
            </span>
            <PositionBubble isFor={isFor} fontSize="12px" />
          </div>

          <InfoRow
            label="Value"
            value={isLoadingTrust ? "Loading..." : trustAmount || "N/A"}
          />
          <InfoRow
            label="Term Value"
            value={isLoadingTermValue ? "Loading..." : termValue || "N/A"}
          />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "8px",
          }}
        >
          <RedeemSelector
            isSelected={isSelected}
            onSelect={onSelect || (() => {})}
            positionId={position.id}
          />

          {/* Interface de configuration qui apparaît à droite quand la checkbox est cochée */}
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
    </div>
  );
};

export default PositionCard;
