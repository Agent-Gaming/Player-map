import React from "react";
import { calculateEthCost, calculateGasCost } from "../../utils/voteUtils";

interface TransactionInfoProps {
  numberOfTransactions: number;
  totalUnits: number;
  onResetAll: () => void;
}

export const TransactionInfo: React.FC<TransactionInfoProps> = ({
  numberOfTransactions,
  totalUnits,
  onResetAll,
}) => {
  return (
    <div
      style={{
        padding: "10px, 20px",
        borderRadius: "8px",
        marginBottom: "25px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
        <div>
          <div style={{ fontSize: "0.9em", color: "#FFFFFF" }}>
            Unit value
          </div>
          <div style={{ fontSize: "1.1em", fontWeight: "bold", color: "#FFD32A" }}>
            {calculateEthCost(totalUnits)} $TRUST
          </div>
        </div>
        
        <div>
          <div style={{ fontSize: "0.9em", color: "#FFFFFF" }}>
            Nb transactions
          </div>
          <div style={{ fontSize: "1.1em", fontWeight: "bold", color: "#FFD32A" }}>
            {numberOfTransactions}
          </div>
        </div>
        
        <div>
          <div style={{ fontSize: "0.9em", color: "#FFFFFF" }}>
            Estimated gas cost
          </div>
          <div style={{ fontSize: "1.1em", fontWeight: "bold", color: "#FFD32A" }}>
            ~{calculateGasCost(numberOfTransactions)} $TRUST
          </div>
        </div>

        <div style={{ fontSize: "0.9em", color: "#FFFFFF" }}>
          Total units selected:
          <span style={{ fontSize: "1.1em", fontWeight: "bold", color: "#FFD32A" }}>
            {totalUnits} {totalUnits === 1 ? "unit" : "units"}
          </span>
        </div>
        
        {totalUnits > 0 && (
          <button
            onClick={onResetAll}
            style={{
              backgroundColor: "#FFD32A",
              color: "#000",
              padding: "6px 12px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.9em",
            }}
          >
            Reset all
          </button>
        )}

      </div>

    </div>
  );
}; 