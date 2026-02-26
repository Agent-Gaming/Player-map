import React from "react";
import { calculateEthCost, calculateGasCost } from "../../utils/voteUtils";

interface TransactionInfoProps {
  numberOfTransactions: number;
  totalUnits: number;
  onResetAll: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isDepositLoading: boolean;
}

export const TransactionInfo: React.FC<TransactionInfoProps> = ({
  numberOfTransactions,
  totalUnits,
  onResetAll,
  onSubmit,
  isSubmitting,
  isDepositLoading,
}) => {
  const isProcessing = isSubmitting || isDepositLoading;
  const canSubmit = totalUnits > 0 && !isProcessing;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 20px",
        marginBottom: "15px",
        gap: "16px",
        flexShrink: 0,
      }}
    >
      {/* Stats */}
      <div style={{ display: "flex", gap: "32px", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "0.85em", fontWeight: "bold", color: "#FFD32A", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Position(s) selected
          </div>
          <div style={{ fontSize: "1.2em", fontWeight: "bold", color: "#FFFFFF" }}>
            {numberOfTransactions}
          </div>
        </div>

        <div>
          <div style={{ fontSize: "0.85em", fontWeight: "bold", color: "#FFD32A", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Total $TRUST
          </div>
          <div style={{ fontSize: "1.2em", fontWeight: "bold", color: "#FFFFFF" }}>
            {calculateEthCost(totalUnits)}
          </div>
        </div>

        <div>
          <div style={{ fontSize: "0.85em", fontWeight: "bold", color: "#FFD32A", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Total cost
          </div>
          <div style={{ fontSize: "1.2em", fontWeight: "bold", color: "#FFFFFF" }}>
            ${calculateGasCost(numberOfTransactions)}
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: "10px", flexShrink: 0 }}>
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: canSubmit ? "#FFD32A" : "#444",
            color: canSubmit ? "#000" : "#888",
            padding: "10px 20px",
            border: "none",
            borderRadius: "6px",
            fontSize: "0.9em",
            fontWeight: "bold",
            cursor: canSubmit ? "pointer" : "not-allowed",
            transition: "background-color 0.2s ease",
          }}
        >
          ✔ {isProcessing ? "Processing..." : "SUBMIT"}
        </button>

        <button
          onClick={onResetAll}
          disabled={totalUnits === 0}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: totalUnits > 0 ? "#FFD32A" : "#444",
            color: totalUnits > 0 ? "#000" : "#888",
            padding: "10px 20px",
            border: "none",
            borderRadius: "6px",
            fontSize: "0.9em",
            fontWeight: "bold",
            cursor: totalUnits > 0 ? "pointer" : "not-allowed",
          }}
        >
          ↺ RESET
        </button>
      </div>
    </div>
  );
}; 