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
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        padding: "10px",
        borderRadius: "8px",
        marginBottom: "25px",
        display: "flex",
        flexDirection: "column",
        border: "1px solid rgb(105, 105, 105)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
        <div>
          <div style={{ fontSize: "0.9em", color: "#6b7280" }}>
            Unit value:
          </div>
          <div style={{ fontSize: "1.1em", fontWeight: "bold", color: "#FFD32A" }}>
            {calculateEthCost(totalUnits)} TRUST
          </div>
        </div>
        
        <div>
          <div style={{ fontSize: "0.9em", color: "#6b7280" }}>
            Number of transactions:
          </div>
          <div style={{ fontSize: "1.1em", fontWeight: "bold", color: "#FFD32A" }}>
            {numberOfTransactions}
          </div>
        </div>
        
        <div>
          <div style={{ fontSize: "0.9em", color: "#6b7280" }}>
            Estimated gas cost:
          </div>
          <div style={{ fontSize: "1.1em", fontWeight: "bold", color: "#FFD32A" }}>
            ~{calculateGasCost(numberOfTransactions)} TRUST
          </div>
        </div>
      </div>

      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center"
      }}>
        <div style={{ fontSize: "1em", fontWeight: "bold" }}>
          Total units selected:
          <span style={{ fontSize: "1.6em", marginLeft: "10px", color: "#FFD32A" }}>
            {totalUnits} {totalUnits === 1 ? "unit" : "units"}
          </span>
        </div>
        
        {totalUnits > 0 && (
          <button
            onClick={onResetAll}
            style={{
              backgroundColor: "transparent",
              border: "1px solid #6b7280",
              color: "#FFF",
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