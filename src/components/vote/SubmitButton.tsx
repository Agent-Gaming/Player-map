import React from "react";
import { calculateEthCost } from "../../utils/voteUtils";

interface SubmitButtonProps {
  onSubmit: () => void;
  isSubmitting: boolean;
  isDepositLoading: boolean;
  totalUnits: number;
  numberOfTransactions: number;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({
  onSubmit,
  isSubmitting,
  isDepositLoading,
  totalUnits,
  numberOfTransactions,
}) => {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ marginBottom: "15px", fontSize: "0.9em", color: "#6b7280" }}>
        {numberOfTransactions > 0 && `You will initiate ${numberOfTransactions} transaction${numberOfTransactions > 1 ? 's' : ''}`}
      </div>
      
      <button
        onClick={onSubmit}
        disabled={isSubmitting || isDepositLoading || totalUnits === 0}
        style={{
          backgroundColor: totalUnits > 0 && !isSubmitting && !isDepositLoading 
            ? "#1976d2" 
            : "rgb(105, 105, 105)",
          color: "#FFF",
          padding: "12px 30px",
          border: "none",
          borderRadius: "8px",
          fontSize: "1.1em",
          fontWeight: "bold",
          cursor: totalUnits > 0 && !isSubmitting && !isDepositLoading ? "pointer" : "not-allowed",
          width: "100%",
          maxWidth: "350px",
          boxShadow: "0 4px 10px rgba(0, 0, 0, 0.3)",
          transition: "background-color 0.2s ease",
        }}
      >
        {isSubmitting || isDepositLoading
          ? "Processing..." 
          : totalUnits > 0 ? `Submit votes (${calculateEthCost(totalUnits)} TRUST)` : "Submit votes"}
      </button>
    </div>
  );
}; 