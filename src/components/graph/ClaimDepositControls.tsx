import React, { useState, useEffect } from "react";
import { fetchPositions } from "../../api/fetchPositions";
import { Network } from "../../hooks/useAtomData";

interface ClaimDepositControlsProps {
  claim: any;
  walletAddress?: string;
  walletConnected?: any;
  publicClient?: any;
  onSelectionChange?: (
    trust: number,
    direction: "for" | "against" | "neutral"
  ) => void;
}

const ClaimDepositControls: React.FC<ClaimDepositControlsProps> = ({
  claim,
  walletAddress,
  onSelectionChange,
}) => {
  const [position, setPosition] = useState<"for" | "neutral" | "against">(
    "neutral"
  );
  const [trust, setTrust] = useState<number>(0);
  const [userPositions, setUserPositions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch user positions for this claim
  useEffect(() => {
    const fetchUserPositions = async () => {
      if (!walletAddress) return;

      try {
        const positions = await fetchPositions(walletAddress, Network.MAINNET);

        // Filter positions for this specific claim
        // claim.term_id est l'ID du triple, mais on doit comparer avec les term.id des positions
        const claimPositions = positions.filter((pos: any) => {
          if (!pos.term?.id) return false;
          // Vérifier si la position est sur le terme FOR de ce claim
          const isForPosition = pos.term?.id === claim.term?.id;
          // Vérifier si la position est sur le terme AGAINST de ce claim
          const isAgainstPosition = pos.term?.id === claim.counter_term?.id;
          return isForPosition || isAgainstPosition;
        });

        setUserPositions(claimPositions);

        // Déterminer la position actuelle de l'user
        const forPosition = claimPositions.find(
          (pos: any) => pos.term?.id === claim.term?.id && pos.shares > 0
        );
        const againstPosition = claimPositions.find(
          (pos: any) =>
            pos.term?.id === claim.counter_term?.id && pos.shares > 0
        );

        if (forPosition) {
          setPosition("for");
        } else if (againstPosition) {
          setPosition("against");
        } else {
          setPosition("neutral");
        }
      } catch (err) {
        console.error("Error fetching user positions:", err);
      }
    };

    fetchUserPositions();
  }, [walletAddress, claim.term?.id, claim.counter_term?.id]);

  // Validation: prevent For if user has Against position > 0 and vice versa
  const canSelectPosition = (newPosition: "for" | "neutral" | "against") => {
    if (newPosition === "for") {
      // Empêcher FOR si l'user a déjà une position AGAINST
      const hasAgainstPosition = userPositions.some(
        (pos: any) => pos.term?.id === claim.counter_term?.id && pos.shares > 0
      );
      return !hasAgainstPosition;
    } else if (newPosition === "against") {
      // Empêcher AGAINST si l'user a déjà une position FOR
      const hasForPosition = userPositions.some(
        (pos: any) => pos.term?.id === claim.term?.id && pos.shares > 0
      );
      return !hasForPosition;
    } else if (newPosition === "neutral") {
      // Empêcher NEUTRAL si l'user a déjà une position active (FOR ou AGAINST)
      const hasActivePosition = userPositions.some(
        (pos: any) =>
          (pos.term?.id === claim.term?.id ||
            pos.term?.id === claim.counter_term?.id) &&
          pos.shares > 0
      );
      return !hasActivePosition;
    }
    return true;
  };

  const handlePositionChange = (newPosition: "for" | "neutral" | "against") => {
    if (newPosition === "for" || newPosition === "against") {
      if (!canSelectPosition(newPosition)) {
        setError(
          `You already have a ${
            newPosition === "for" ? "Against" : "For"
          } position on this claim`
        );
        return;
      }
    }

    setError(null);
    setPosition(newPosition);

    // Reset trust when changing to neutral
    if (newPosition === "neutral") {
      setTrust(0);
    }

    // Notify parent component
    if (onSelectionChange) {
      onSelectionChange(trust, newPosition);
    }
  };

  const handleTrustChange = (value: string) => {
    const numValue = parseFloat(value);
    const MIN_VALUE = 0.01;

    // If empty or invalid, set to 0
    if (isNaN(numValue) || numValue < 0) {
      setTrust(0);
      if (onSelectionChange) {
        onSelectionChange(0, position);
      }
      return;
    }

    // If value is less than minimum, set to 0 (will show as empty/0 in input)
    if (numValue > 0 && numValue < MIN_VALUE) {
      setTrust(0);
      if (onSelectionChange) {
        onSelectionChange(0, position);
      }
      return;
    }

    // Keep exact value (no rounding)
    const roundedValue = numValue;
    setTrust(roundedValue);

    // Notify parent component
    if (onSelectionChange) {
      onSelectionChange(roundedValue, position);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginTop: "4px",
        justifyContent: "flex-end", // Aligner à droite
      }}
    >
      {/* Error message */}
      {error && (
        <div
          style={{
            color: "#ff6b6b",
            fontSize: "10px",
            marginRight: "8px",
            padding: "2px 6px",
            backgroundColor: "rgba(255, 107, 107, 0.1)",
            borderRadius: "3px",
            border: "1px solid rgba(255, 107, 107, 0.3)",
          }}
        >
          {error}
        </div>
      )}

      {/* Trust Input */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <input
          type="number"
          value={trust}
          onChange={(e) => handleTrustChange(e.target.value)}
          step="0.001"
          min="0.01"
          placeholder="0.000"
          style={{
            width: "65px",
            padding: "2px",
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "6px",
            color: "#fff",
            fontSize: "12px",
            textAlign: "left",
            marginBottom: "2px",
          }}
          disabled={position === "neutral"}
        />
        <span
          style={{
            fontSize: "12px",
            color: "rgba(255, 255, 255, 0.6)",
            fontWeight: "500",
          }}
        >
          TRUST
        </span>
      </div>

      {/* Toggle 3 positions - Switch style */}
      <div
        style={{
          position: "relative",
          width: "60px",
          height: "20px",
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          borderRadius: "10px",
          cursor: "pointer",
          opacity:
            canSelectPosition("for") &&
            canSelectPosition("against") &&
            canSelectPosition("neutral")
              ? 1
              : 0.5,
        }}
        onClick={() => {
          // Cycle through positions: neutral -> for -> against -> neutral
          if (position === "neutral" && canSelectPosition("for")) {
            handlePositionChange("for");
          } else if (position === "for" && canSelectPosition("against")) {
            handlePositionChange("against");
          } else if (position === "against" && canSelectPosition("neutral")) {
            handlePositionChange("neutral");
          } else if (
            position === "for" &&
            !canSelectPosition("against") &&
            canSelectPosition("neutral")
          ) {
            handlePositionChange("neutral");
          } else if (
            position === "against" &&
            !canSelectPosition("for") &&
            canSelectPosition("neutral")
          ) {
            handlePositionChange("neutral");
          }
        }}
        title={
          !canSelectPosition("for") ||
          !canSelectPosition("against") ||
          !canSelectPosition("neutral")
            ? "You already have an active position on this claim"
            : `Current: ${position.toUpperCase()} - Click to change`
        }
      >
        {/* Switch indicator */}
        <div
          style={{
            position: "absolute",
            top: "2px",
            left:
              position === "for"
                ? "2px"
                : position === "against"
                ? "42px"
                : "20px",
            width: "16px",
            height: "16px",
            backgroundColor:
              position === "for"
                ? "rgb(0, 111, 232)"
                : position === "against"
                ? "rgb(255, 149, 0)"
                : "rgba(255, 255, 255, 0.3)",
            borderRadius: "50%",
            transition: "all 0.2s ease",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
          }}
        />
      </div>
    </div>
  );
};

export default ClaimDepositControls;
